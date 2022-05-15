import { BufferGeometry, DoubleSide, Material, Mesh, MeshLambertMaterial, MeshPhongMaterial } from 'three';
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';

export const Bridge = window.electron.ipcRenderer;
export const AppName = 'ProtoUV';

BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
Mesh.prototype.raycast = acceleratedRaycast;

export const MaterialForSupports = {
	normal: new MeshLambertMaterial({ transparent: true, opacity: 0.6, color: '#5bc3fc' }),
	preview: new MeshLambertMaterial({ transparent: true, opacity: 0.2, color: '#80caff' })
};

export const MatLine = new LineMaterial({
	color: 0xa1a1a1,
	linewidth: 3
});

export type SceneMaterial = {
  normal: Material;
  select: Material;
};

export const SceneMaterials = {
	transparent: {
		normal: new MeshPhongMaterial({ color: '#ff7f7f', opacity: 0.7, transparent: true }),
		select: new MeshPhongMaterial({ color: '#858dff', opacity: 0.7, transparent: true }),
	} as SceneMaterial,
	default: {
		normal: new MeshPhongMaterial( { color: '#f8a745', emissive:'#ffd4d4',
			emissiveIntensity: 0.2 , flatShading: true, side: DoubleSide, shininess: 20 } ),
		select: new MeshPhongMaterial( { color: '#858dff', emissive:'#ffd4d4',
			emissiveIntensity: 0.2 , flatShading: true, side: DoubleSide, shininess: 20 } ),
	} as SceneMaterial,
};
