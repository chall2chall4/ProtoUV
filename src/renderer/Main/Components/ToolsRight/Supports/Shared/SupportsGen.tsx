import { AppStore } from 'renderer/AppStore';
import { Printer } from 'renderer/Main/Printer/Configs/Printer';
import { toUnits } from 'renderer/Shared/Globals';
import { CatmullRomCurve3, CylinderGeometry, ExtrudeGeometry, Material, Mesh, MeshLambertMaterial, Shape, SphereGeometry, Vector2, Vector3 } from 'three';
import { SupportsRays } from './SupportsRays';
import { VoxelizationFreeSpace } from './SupportsVoxelization';

export const SupportsGenerator = (printer: Printer, mesh: Mesh, meshes: Mesh[]) => {
	const voxelization = VoxelizationFreeSpace(
		mesh,
		printer
	);

	const _supports = [] as Mesh[];

	voxelization.PositionsProbe.forEach(x => {
		if (x.Touchpoint)
		{
			x.Path = SupportsRays(meshes, printer, x);

			if (x.Path)
			{
				_supports.push(
					_supportCreator(x.Path, x.Touchpoint, printer));
			}
		}
	});

	return _supports;
};

const _supportCreator = (
	path: Vector3[],
	to: Vector3,
	printer: Printer
) => {
	const head = toUnits(printer.SupportPreset.Head);
	const connectionSphere = toUnits(printer.SupportPreset.ConnectionSphere);
	const body = toUnits(printer.SupportPreset.Body);
	const platformWidth = toUnits(printer.SupportPreset.PlatformWidth);
	const platformHeight = toUnits(printer.SupportPreset.PlatformHeight);
	const spline = new CatmullRomCurve3(path);
	const material = new MeshLambertMaterial( { color: 0xb00000, wireframe: false } );
	const extrudeSettings = {
		steps: 100,
		bevelEnabled: false,
		extrudePath: spline
	};

	const pts1 = [], count = 6;
	for ( let i = 0; i < count; i ++ ) {
		const l = body;
		const a = 2 * i / count * Math.PI;
		pts1.push( new Vector2( Math.cos( a ) * l, Math.sin( a ) * l ) );
	}

	const shape1 = new  Shape( pts1 );
	const geometry1 = new  ExtrudeGeometry( shape1, extrudeSettings );
	const mesh1 = new Mesh(geometry1, material);

	// Create bottom
	{
		const from = path[path.length-1];
		const to = path[path.length-1].clone().setY(path[path.length-1].y + platformHeight);
		mesh1.add(createCylinder(material, from, to, to.distanceTo(from), platformWidth * 0.75, platformWidth).mesh);
	}
	mesh1.add(createContactSphere(material, path[0], connectionSphere).mesh);
	mesh1.add(createCylinder(material, path[0], to, to.distanceTo(path[0]), body, head).mesh);
	mesh1.add(createContactSphere(material, to, connectionSphere).mesh);

	return mesh1;
};

const createCylinder = (
	material: Material,
	positionStart: Vector3,
	positionEnd: Vector3,
	height: number,
	diameterBottom: number,
	diameterTop: number
) => {
	const geometry = new CylinderGeometry( diameterTop, diameterBottom,  height , 6); //to mm
	const mesh = new Mesh( geometry, material );
	const center = new Vector3((positionEnd.x + positionStart.x) / 2, (positionEnd.y + positionStart.y) / 2, (positionEnd.z + positionStart.z) / 2);

	mesh.position.set(center.x, center.y, center.z);
	mesh.lookAt(positionStart);
	mesh.rotateX(-Math.PI / 2);

	return {
		mesh: mesh,
	};
};
const createContactSphere = (
	material: Material,
	positionStart: Vector3,
	diameter: number
) => {
	const geometry = new SphereGeometry( diameter * 1.025, 9, 9);
	const mesh = new Mesh( geometry, material );

	mesh.position.set(positionStart.x, positionStart.y, positionStart.z);

	return {
		mesh: mesh
	};
};
