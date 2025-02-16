const WIDTH = 320;
const HEIGHT = 240;
const SCALE = 3;

// Adding this property to the global Module so we can work out if its ready or not
let Module = window['Module']= {} as any;
Module.onRuntimeInitialized = ()=>{
    Module.wasmReady = true;
}


class SandComponent extends HTMLElement {
    private animRequestId: number | null = null;
    private lastTime = 0;
    private wasmDraw = (seed:number, mode:number, timeDelta: number, mouseX: number, mouseY: number, mouseDown: boolean, bigBrush: boolean) => { };
    private wasmReset = () => { };
    private mouseDown: boolean = false;
    private mousePos: [number, number] = [0, 0];
    private bigBrush: boolean;
    private shadow: ShadowRoot;
    private ctx: CanvasRenderingContext2D;
    private imageData: ImageData;
    private arrayBufferView: Uint8Array;
    private drawSeed: number=1;
    private image;
    private modeButton: HTMLElement;
    private mode = 0;

    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {

        // Canvas Element
        const canvas = document.createElement("canvas") as HTMLCanvasElement;
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        canvas.style.imageRendering = "pixelated";
        canvas.style.width = canvas.width * SCALE + "px";
        canvas.style.height = canvas.height * SCALE + "px";
        canvas.addEventListener("mousemove", evt => { this.mousePos = [Math.floor(evt.offsetX / SCALE), Math.floor(evt.offsetY / SCALE)]; });
        canvas.addEventListener("mousedown", () => { this.mouseDown = true; });
        canvas.addEventListener("mouseup", () => { 
            this.mouseDown = false;
            this.drawSeed = Math.floor(Math.random()*255);
         });
        canvas.addEventListener("mouseout", () => { this.mouseDown = false; });
        this.ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
        this.shadow.appendChild(canvas);

        // image data and array buffer to hold shared memory
        const buf = new ArrayBuffer(WIDTH * HEIGHT * 4);
        this.arrayBufferView = new Uint8Array(buf);
        this.imageData = this.ctx.createImageData(canvas.width, canvas.height);

        // Brush Checkbox
        const brushLabel = document.createElement("label");
        const brushCheckbox = document.createElement("input") as HTMLInputElement;
        brushCheckbox.type = "checkbox";
        brushCheckbox.addEventListener("change", () => this.bigBrush = brushCheckbox.checked);
        brushLabel.append(brushCheckbox);
        brushLabel.appendChild(document.createTextNode("Big Brush"));
        this.shadow.append(brushLabel);

        // Mode button
        this.modeButton = this.ownerDocument.createElement("button");
        this.modeButton.innerText = "Mode: Sand";
        this.shadow.appendChild(this.modeButton);
        this.modeButton.addEventListener("click", () => {
            this.mode = (this.mode+1)%2;
            this.modeButton.textContent = "Mode: " + ["Sand","Destroy"][this.mode];
        });

        // reset button
        const resetButton = this.ownerDocument.createElement("button");
        resetButton.innerText = "Reset";
        this.shadow.appendChild(resetButton);
        resetButton.addEventListener("click", () => this.wasmReset());

        // Create an observer
        let options: IntersectionObserverInit = {
            rootMargin: "0px",
            threshold: 0,
        };
        var observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.intersectionRatio > 0 && this.animRequestId == null) {
                    console.log("Start")
                    this.requestAnim();
                } else if (entry.intersectionRatio <= 0) {
                    console.log("Stop")
                    this.stopAnim();
                }
            });
        }, options);
        observer.observe(canvas);

        // Add a script for the WASM element
        const wasmElement = document.createElement("script") as HTMLScriptElement;
        wasmElement.type = "text/javascript";
        wasmElement.async = true;
        wasmElement.addEventListener("load", () => {
            if (Module.wasmReady) {
                this.onWasmLoad()
            } else {
                Module.onRuntimeInitialized = () => this.onWasmLoad();
            }
        });
        wasmElement.src = "index.js";
        this.appendChild(wasmElement)
    }

    private requestAnim() {
        this.animRequestId = window.requestAnimationFrame(time => this.draw(time));
    }

    private stopAnim() {
        if (this.animRequestId != null) {
            window.cancelAnimationFrame(this.animRequestId);
            this.animRequestId = null;
        }
    }

    private pixelArray: Uint8Array;

    private onWasmLoad() {
            console.log("WASM init");

            // Get exported functions
            this.wasmDraw = Module._draw;
            this.wasmReset = Module._reset;
            const getArray = Module._getArray;
            const initSand = Module._initSand;

            // Link up WASM array with this.myArray
            const len = WIDTH * HEIGHT * 4;
            const arr = getArray(len);
            this.pixelArray = new Uint8Array(Module.HEAP8.buffer, arr, len);

            this.image = new Image();
            this.image.addEventListener("load", () => {
                console.log("Image load")
                this.ctx.drawImage(this.image, 0, 0);
                const data = this.ctx.getImageData(0, 0, WIDTH, HEIGHT);
                this.pixelArray.set(data.data);
                initSand();
            });
            this.image.src = "level.png"

            this.requestAnim();
    }

    private draw(time: number) {
        // Frame Time
        const MAX_FRAME_TIME_MS = 200;
        const timeDelta = Math.min(time - this.lastTime, MAX_FRAME_TIME_MS);
        this.lastTime = time;

        // Call WASM function
        this.wasmDraw(this.drawSeed, this.mode, timeDelta,
            this.mousePos[0], this.mousePos[1], this.mouseDown,
            this.bigBrush);

        // Copy the shared array into the image data and draw it
        if (this.pixelArray) {
            this.arrayBufferView.set(this.pixelArray); // Efficiently copies the contents
            this.imageData.data.set(this.arrayBufferView);
            this.ctx.putImageData(this.imageData, 0, 0);
        }

        this.requestAnim();
    }
}


customElements.define("sand-component", SandComponent);