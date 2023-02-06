import _ from 'lodash';
import { makeAutoObservable } from 'mobx';
import { SceneObject } from 'renderer/Main/Scene/Entities/SceneObject';
import { Vector3 } from 'three';
import { singleton } from 'tsyringe';
import { AppStore, Log, Pages } from '../AppStore';
import { PrinterConfig } from '../Main/Printer/Configs/Printer';
import { config, saveConfig } from '../Shared/Config';
import { bridge } from '../Shared/Globals';

@singleton()
export class SlicingStore {
	constructor() {
		makeAutoObservable(this);

		setTimeout(() =>
			this.registrationReceivers(), 500);
	}

	public isWorking = false;
	public sliceCount = 0;
	public sliceCountMax = 0;
	public sliceTo = 0;
	public image = '';

	public imageLargest = '';
	public imageLargestLayer = 0;
	public imageLargestSize = 0;
	public workerCount = 0;

	public gcode = '';

	public run = () => {
		this.isWorking = true;
		Log('run prepare to slicing...');
		bridge.ipcRenderer.send('prepare-to-slicing');
	};

	public reset = () => {
		AppStore.instance.progressPercent = 0;
		this.gcode = '';
		this.isWorking = false;
		this.sliceCount = 0;
		this.sliceCountMax = 0;
		this.sliceTo = 0;
		this.image = '';
		this.imageLargest = '';
		this.imageLargestLayer = 0;
		this.imageLargestSize = 0;
	};

	public finalize = (saveAutomatically: boolean, isSave: boolean) => {
		bridge.ipcRenderer.send('sliced-finalize' + (isSave ? '-save': ''),
			this.gcode, bridge.assetsPath() + config.pathToUVTools, AppStore.sceneStore.printer!.Export.Encoder,
      AppStore.sceneStore.printer!.Export.Extencion, AppStore.sceneStore.objects[0].name,
      config.pathToSave, saveAutomatically);
	};

	private animate = () => {
		if (AppStore.getState() !== Pages.Slice || !this.isWorking)
		{
			Log('slice not ready');
			this.isWorking = false;
			return;
		}

		const sharpness = config.scene.sharpness.toString().length - 2;
		const layerHeight = (AppStore.sceneStore.printer!.PrintSettings.LayerHeight * 0.1);
		const printer = AppStore.sceneStore.printer!;

		const arrangeJobByWorker: { percent: number, i: number }[] = [];

		while (this.sliceCount <= this.sliceCountMax)
		{
			arrangeJobByWorker.push({
				percent: (this.sliceCount/this.sliceCountMax) * this.sliceTo / AppStore.sceneStore.gridSize.y,
				i: this.sliceCount
			});

			const moveTo = (layerHeight * this.sliceCount)* 10;

			this.gcode += '\n\n' + printer.GCode.ShowImage.replace('*x', (this.sliceCount + 1).toString());
			this.gcode += '\n' + printer.GCode.MoveTo
				.replace('*x', (moveTo + printer.PrintSettings.LiftingHeight).toFixed(sharpness))
				.replace('*y', printer.PrintSettings.LiftingSpeed.toString());
			this.gcode += '\n' + printer.GCode.MoveTo
				.replace('*x', (moveTo).toFixed(sharpness))
				.replace('*y', printer.PrintSettings.LiftingSpeed.toString());
			this.gcode += '\n' + printer.GCode.Delay
				.replace('*x', (printer.PrintSettings.DelayTime*1000).toString());
			this.gcode += '\n' + printer.GCode.LightOn;
			this.gcode += '\n' + printer.GCode.Delay
				.replace('*x', (printer.PrintSettings.BottomLayers >= this.sliceCount
					? printer.PrintSettings.BottomExposureTime * 1000
					: printer.PrintSettings.ExposureTime * 1000)
					.toString());
			this.gcode += '\n' + printer.GCode.LightOff;

			this.sliceCount += 1;

			if (this.sliceCount > this.sliceCountMax) {
				AppStore.instance.progressPercent = 1;
				break;
			}
			else {
				AppStore.instance.progressPercent = (this.sliceCount/this.sliceCountMax);
			}

			if (!this.isWorking)
			{
				Log('slicing cancelled!');
				return;
			}
		}

		const created = SceneObject.CreateClipping(SceneObject.CalculateSceneGeometry()).group.toJSON();

		const workerSpawn = (layers: { i: number, percent: number }[]) => {
			return new Promise(resolve => {
				const worker = new Worker(bridge.assetsPath() + '/workers/slice.worker.bundle.js');
				const canvas = new OffscreenCanvas(256, 256);

				worker.onmessage = function (e) {
					switch (e.data.type)
					{
						case SliceWorkerResultType.SliceResult:
							bridge.ipcRenderer.send('sliced-layer-save',
								e.data.image.replace('data:image/png;base64,',''),
								(e.data.layer.i + 1)+'.png');
							return;
						case SliceWorkerResultType.JobDone:
							worker.terminate();
							resolve(true);
							return;
					}
				};

				worker.postMessage({
					canvas: canvas,
					gridSize: AppStore.sceneStore.gridSize,
					printer: AppStore.sceneStore.printer!,
					geometry: created,
					layers: layers
				} as SliceWorker, [canvas]);
			});
		};

		const task = new Promise(resolve => {
			let workersCountDone = 0;
			let workerJob = [];
			while (arrangeJobByWorker.length)
			{
				workerJob.push(arrangeJobByWorker.pop()!);

				if (workerJob.length >= this.sliceCountMax / config.workerCount
          || !arrangeJobByWorker.length)
				{
					workerSpawn(workerJob).then(() => {
						workersCountDone++;
						if (workersCountDone >= config.workerCount)
						{
							resolve(true);
						}
					});
					workerJob = [];
				}
			}
		});

		task.then(() => {
			console.log('job done');
		});

		this.gcode += '\n\n;END_GCODE_BEGIN';
		this.gcode += '\n' + AppStore.sceneStore.printer!.GCode.End
			.replace('*x', printer.Workspace.Height.toString());
		this.gcode += '\n;END_GCODE_END';

		//this.finalize(false, false);
	};

	public registrationReceivers = () => {
		const store = AppStore.sceneStore;
		const printer = AppStore.sceneStore.printer!;

		if (bridge.isWorker()) {
			bridge.ipcRenderer.send('prepare-to-slicing-worker-ready');
			bridge.ipcRenderer.receive('prepare-to-slicing-worker-take-job', (json: string, workerJobs: { layer: number, percent: number }[]) => {
				const obj = JSON.parse(json);

				console.log(obj, workerJobs);

				obj.sceneObjects.forEach((x: string) => {
					const sceneObject = SceneObject.FromJson(x);
					AppStore.sceneStore.objects.push(sceneObject);
					AppStore.sceneStore.scene.add(sceneObject.mesh);
					sceneObject.supports?.forEach(y => AppStore.sceneStore.scene.add(y));
				});

				AppStore.sceneStore.setupPrinter(JSON.parse(obj.printer));
				AppStore.sceneStore.animate(true);

				//while (jobs.length > 0)
				//{
				//	const job = workerJobs.shift()!;
				//	this.image = AppStore.sceneStore.sliceLayer(job.percent,
				//		job.layer, SliceType.Normal);
				//}
				//bridge.ipcRenderer.send('sliced-layer-worker-done');
			});
		}
		else {
			bridge.ipcRenderer.receive('prepare-to-slicing-ready', () => {
				this.reset();
				Log('prepare to slicing done!');
				this.isWorking = true;
				const maxObjectsPoint = _.maxBy(store.objects, (x: SceneObject) => x.maxY.y);
				this.sliceTo = Math.min(store.gridSize.y, maxObjectsPoint!.maxY.y);
				this.sliceCountMax = Math.ceil(this.sliceTo / (printer.PrintSettings.LayerHeight * 0.1));
				this.sliceCount = 0;
				this.gcode = `;fileName:${store.objects[0].name}
;machineType:${store.printer?.Name}
;estimatedPrintTime:${printer.PrintSettings.BottomExposureTime * printer.PrintSettings.BottomLayers
        + printer.PrintSettings.ExposureTime * this.sliceCountMax
        + printer.PrintSettings.DelayTime * this.sliceCountMax}
;volume:1
;resin:normal
;weight:1
;price:1
;layerHeight:${printer.PrintSettings.LayerHeight}
;resolutionX:${printer.Resolution.X}
;resolutionY:${printer.Resolution.Y}
;machineX:${printer.Workspace.SizeX}
;machineY:${printer.Workspace.SizeY}
;machineZ:${printer.Workspace.Height}
;projectType:LCD_mirror
;normalExposureTime:${printer.PrintSettings.ExposureTime}
;bottomLayExposureTime:${printer.PrintSettings.BottomExposureTime}
;bottomLayerExposureTime:${printer.PrintSettings.BottomExposureTime}
;normalDropSpeed:${printer.PrintSettings.LiftingSpeed}
;normalLayerLiftHeight:${printer.PrintSettings.LiftingHeight}
;zSlowUpDistance:0
;normalLayerLiftSpeed:${printer.PrintSettings.LiftingSpeed}
;bottomLayCount:${printer.PrintSettings.BottomLayers}
;bottomLayerCount:${printer.PrintSettings.BottomLayers}
;mirror:1
;totalLayer:${this.sliceCountMax}
;bottomLayerLiftHeight:${printer.PrintSettings.LiftingHeight}
;bottomLayerLiftSpeed:${printer.PrintSettings.LiftingSpeed}
;bottomLightOffTime:0
;lightOffTime:0`;
				this.gcode += '\n\n;START_GCODE_BEGIN';
				this.gcode += '\n' + AppStore.sceneStore.printer!.GCode.Start;
				this.gcode += '\n;START_GCODE_END';
				this.animate();
				Log('slice layers max: ' + this.sliceCountMax);
			});
			bridge.ipcRenderer.receive('sliced-finalize-result-save', (error: string | null, success: string | null, filePath?: string) => {
				if (error) {
					Log(error);
				}
				if (success) {
					config.pathToSave = filePath ?? config.pathToSave;
					saveConfig();
					Log(success + ' to: ' + filePath);
					AppStore.changeState(Pages.Main);
				}
			});
			bridge.ipcRenderer.receive('sliced-finalize-result', (error: string | null) => {
				if (error) {
					Log(error);
				}

				if (config.saveAutomatically) {
					this.finalize(true, true);
				}

				Log('slicing done!');
				this.isWorking = false;
			});
		}
	};
}

export interface SliceWorker {
  canvas: OffscreenCanvas;
  printer: PrinterConfig;
  geometry: string;
  gridSize: Vector3;
  layers: {i: number, percent: number}[];
}

export enum SliceWorkerResultType {
  SliceResult,
  JobDone
}

export interface SliceWorkerLayerResult {
  type: SliceWorkerResultType.SliceResult;
  image: string;
  percent: {i: number, percent: number};
  remainder: number;
}

export interface SliceWorkerJobDone {
  type: SliceWorkerResultType.JobDone;
}
