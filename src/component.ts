
class SandComponent extends HTMLElement {
    private animRequestId: number | null = null;
    private lastTime = 0;
    private wasmDraw = (timeDelta: number, mouseX: number, mouseY: number, mouseDown: boolean, bigBrush: boolean) => { };
    private wasmReset = () => { };
    private mouseDown: boolean = false;
    private mousePos: [number, number] = [0, 0];
    private bigBrush: boolean;
    // private shadow: ShadowRoot;
    private ctx: CanvasRenderingContext2D;
    private imageData: ImageData;

    constructor() {
        super();
        // this.shadow = this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {

        // Canvas Element
        const canvas = document.createElement("canvas") as HTMLCanvasElement;
        canvas.width = 320;
        canvas.height = 240;
        canvas.style.imageRendering= "pixelated";
        const scale = 3;
        canvas.style.width = canvas.width * scale + "px";
        canvas.style.height = canvas.height * scale + "px";
        canvas.addEventListener("mousemove", evt => { this.mousePos = [Math.floor(evt.offsetX / scale), Math.floor(evt.offsetY / scale)]; });
        canvas.addEventListener("mousedown", () => { this.mouseDown = true; });
        canvas.addEventListener("mouseup", () => { this.mouseDown = false; });
        canvas.addEventListener("mouseout", () => { this.mouseDown = false; });
        this.ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
        this.appendChild(canvas);

        // image data
        this.imageData = this.ctx.createImageData(canvas.width, canvas.height);


        // Brush Checkbox
        const brushLabel = document.createElement("label");
        const brushCheckbox = document.createElement("input") as HTMLInputElement;
        brushCheckbox.type = "checkbox";
        brushCheckbox.addEventListener("change", () => this.bigBrush = brushCheckbox.checked);
        brushLabel.append(brushCheckbox);
        brushLabel.appendChild(document.createTextNode("Big Brush"));
        this.append(brushLabel);

        // TODO reset button
        const resetButton = this.ownerDocument.createElement("button");
        resetButton.innerText = "Reset";
        this.appendChild(resetButton);
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

        // WASM
        const wasmElement = document.createElement("script") as HTMLScriptElement;
        wasmElement.type = "text/javascript";
        wasmElement.async = true;
        wasmElement.addEventListener("load", (r) => {
            console.log("WASM loaded");
            setTimeout(() => this.onWasmLoad(), 100);
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

    private myArray:Uint8Array;

    private onWasmLoad() {
        this.wasmDraw = createExportWrapper('draw');
        this.wasmReset = createExportWrapper('reset');
        const getArray = createExportWrapper('getArray');

        const len = 320*240*4;
       const arr = getArray(len);
       console.log("arr",arr)
       this.myArray = new Uint8Array(Module.HEAP8.buffer, arr, len); // Example: for byte array
console.log("arr2",this.myArray[0], this.myArray[1])
       

        this.requestAnim();
    }

    private draw(time: number) {
        const MAX_FRAME_TIME_MS = 200;
        const timeDelta = Math.min(time - this.lastTime, MAX_FRAME_TIME_MS);
        this.lastTime = time;
        // const bufferPtr = WebAssembly.Module.exports.allocate_uint8array(this.imageData); //allocate_uint8array from emscripten
        this.wasmDraw(timeDelta,
            this.mousePos[0], this.mousePos[1], this.mouseDown,
            this.bigBrush);
            if(this.myArray){
                
            const buf = new ArrayBuffer(320*240*4);
            const arrayBufferView = new Uint8Array(buf);
            arrayBufferView.set(this.myArray); // Efficiently copies the contents
this.imageData.data.set(arrayBufferView);
            this.ctx.putImageData(this.imageData,0,0);
            console.log("READY", this.imageData.data[3])
        } else {
            console.log("No array")
        }

        this.requestAnim();
    }
}

customElements.define("sand-component", SandComponent);