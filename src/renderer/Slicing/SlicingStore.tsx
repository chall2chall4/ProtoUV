import _ from 'lodash';
import { makeAutoObservable } from 'mobx';
import { SceneObject } from 'renderer/Main/Scene/Entities/SceneObject';
import { singleton } from 'tsyringe';
import { AppStore, Log, Pages } from '../AppStore';
import { config } from '../Shared/Config';
import { bridge } from '../Shared/Globals';

@singleton()
export class SlicingStore {
	constructor() {
		makeAutoObservable(this);
	}

	public isWorking = false;
	public sliceCount = 0;
	public sliceCountMax = 0;
	public sliceTo = 0;
	public image = '';

	public imageLargest = '';
	public imageLargestSize = 0;
	public workerCount = 0;

	public run = () => {
		this.isWorking = true;

		Log('run prepare to slicing...');

		bridge.ipcRenderer.send('prepare-to-slicing');

		bridge.ipcRenderer.receive('prepare-to-slicing', () => {
			Log('prepare to slicing done!');
			const maxObjectsPoint =  _.maxBy(AppStore.sceneStore.objects, (x: SceneObject) => x.maxY.y);
			this.sliceTo = Math.min(AppStore.sceneStore.gridSize.y, maxObjectsPoint!.maxY.y);
			this.sliceCountMax =  Math.ceil(this.sliceTo / (AppStore.sceneStore.printer!.PrintSettings.LayerHeight * 0.1));
			this.sliceCount = 1;
			Log('slice layers max: ' + this.sliceCountMax);
			this.animate();
		});

		//bridge.ipcRenderer.receive('worker-info', (x: number) => {
		//	Log(x+'');
		//	this.workerCount = x;
		//});
	};

	public reset = () => {
		AppStore.instance.progressPercent = 0;
		this.isWorking = false;
		this.sliceCount = 0;
		this.sliceCountMax = 0;
		this.sliceTo = 0;
		this.image = '';
		this.imageLargest = '';
		this.imageLargestSize = 0;
	};

	private animate = () => {
		if (AppStore.getState() !== Pages.Slice || !this.isWorking)
		{
			this.isWorking = false;
			return;
		}

		let rendersCount = this.sliceCountMax / 100;

		while (this.sliceCount <= this.sliceCountMax)
		{
			this.image = AppStore.sceneStore.sliceLayer(
				(this.sliceCount/this.sliceCountMax) * this.sliceTo / AppStore.sceneStore.gridSize.y,
				this.sliceCount);

			this.sliceCount += 1;

			if (this.sliceCount > this.sliceCountMax) {
				AppStore.instance.progressPercent = 1;
				break;
			}
			else {
				AppStore.instance.progressPercent = (this.sliceCount/this.sliceCountMax);
			}

			rendersCount--;

			if (rendersCount < 1)
			{
				break;
			}

			if (!this.isWorking)
			{
				Log('slicing cancelled!');
				return;
			}
		}

		if (this.image.length > this.imageLargestSize)
		{
			this.imageLargest = this.image;
			this.imageLargestSize = this.image.length;
		}

		if (this.sliceCount <= this.sliceCountMax) {
			requestAnimationFrame(this.animate);
		}
		else {
			this.isWorking = false;
			Log('slicing done!');
		}
	};
}
