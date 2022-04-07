import React, { useRef, useEffect } from 'react';
import styles from './index.module.scss';
import {
  Mesh, Scene, ShaderMaterial, WebGLRenderer, Clock, Vector2, OrthographicCamera, MeshBasicMaterial,
  CanvasTexture, PlaneBufferGeometry, WebGLRenderTarget
} from 'three';
import fragment from './shader/fragment.frag';
import vertex from './shader/vertex.vert';

class World {
  private scene: Scene;
  private camera: OrthographicCamera;
  private timer = 0;
  private renderer: WebGLRenderer;
  private clock = new Clock();
  private pointer = new Vector2();
  private renderTargetA: WebGLRenderTarget;
  private renderTargetB: WebGLRenderTarget;

  private ppscene = new Scene();
  private pp: Mesh;
  constructor(private container: HTMLDivElement) {
    const { offsetWidth: width, offsetHeight: height } = container;
    this.renderer = new WebGLRenderer();
    this.renderer.setClearColor(0x222222);
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setSize(width, height);
    container.append(this.renderer.domElement);

    this.camera = new OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, 0.1, 10);
    this.camera.position.set(0, 0, 1);
    this.camera.lookAt(0, 0, 0);
    this.scene = new Scene();

    const size = Math.min(this.renderer.capabilities.maxTextureSize, 2048);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const text = 'ABC';
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const fontsize = 20;
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'white';
    ctx.font = `${fontsize}px Helvetica`;
    const { width: textWidth } = ctx.measureText(text);
    ctx.font = `${size / textWidth * fontsize}px Helvetica`;
    ctx.fillText('ABC', size / 2, size / 2);

    const minner = Math.min(width, height);
    const geometry = new PlaneBufferGeometry(minner, minner);
    const material = new MeshBasicMaterial({
      map: new CanvasTexture(canvas),
      transparent: true,
    })
    const mesh = new Mesh(geometry, material);
    this.scene.add(mesh);

    this.renderTargetA = new WebGLRenderTarget(width * window.devicePixelRatio, height * window.devicePixelRatio);
    this.renderTargetB = new WebGLRenderTarget(width * window.devicePixelRatio, height * window.devicePixelRatio);

    this.pp = new Mesh(
      new PlaneBufferGeometry(width, height),
      new ShaderMaterial({
        uniforms: {
          texture1: { value: null },
          uTime: { value: 0 },
          uMouse: { value: new Vector2() },
        },
        vertexShader: vertex,
        fragmentShader: fragment,
      })
    )
    this.ppscene.add(this.pp);
  }
  public draw = () => {
    const time = this.clock.getElapsedTime();

    this.renderer.autoClear = false;

    this.renderer.setRenderTarget(this.renderTargetA);
    this.renderer.render(this.ppscene, this.camera);
    this.renderer.render(this.scene, this.camera);

    this.renderer.setRenderTarget(null);
    (this.pp.material as ShaderMaterial).uniforms.texture1.value = this.renderTargetA.texture;
    (this.pp.material as ShaderMaterial).uniforms.uTime.value = time;
    (this.pp.material as ShaderMaterial).uniforms.uMouse.value.copy(this.pointer);
    this.renderer.render(this.ppscene, this.camera);

    const temp = this.renderTargetA;
    this.renderTargetA = this.renderTargetB;
    this.renderTargetB = temp;

    this.timer = requestAnimationFrame(this.draw);
  }
  public dispose = () => {
    cancelAnimationFrame(this.timer);
  }
  public move = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY } = e;
    const { clientWidth, clientHeight } = this.container;
    this.pointer.set(
      clientX / clientWidth - 0.5,
      -clientY / clientHeight + 0.5,
    )
  }
}

export const App = () => {
  const ref = useRef<HTMLDivElement>(null);
  const refWorld = useRef<World>();
  useEffect(() => {
    if (!ref.current) { return }
    const container = ref.current;
    refWorld.current = new World(container);
    refWorld.current.draw();
    return () => refWorld.current?.dispose();
  }, [ref])

  const move = (e: React.MouseEvent<HTMLDivElement>) => {
    refWorld.current?.move(e);
  }

  return <div
    ref={ref}
    className={styles.container}
    onMouseMove={move}
  />
}