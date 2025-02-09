
class SandComponent extends HTMLElement {
    private animRequestId: number | null = null;
    private lastTime = 0;
    private wasmDraw = (seed: number, timeDelta: number, mouseX: number, mouseY: number, mouseDown: boolean, bigBrush: boolean) => { };
    private wasmReset = () => { };
    private mouseDown: boolean = false;
    private mousePos: [number, number] = [0, 0];
    private bigBrush: boolean;
    // private shadow: ShadowRoot;
    private ctx: CanvasRenderingContext2D;

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

    private onWasmLoad() {
        this.wasmDraw = createExportWrapper('draw');
        this.wasmReset = createExportWrapper('reset');
        this.requestAnim();
    }

    private draw(time: number) {
        const MAX_FRAME_TIME_MS = 200;
        const timeDelta = Math.min(time - this.lastTime, MAX_FRAME_TIME_MS);
        this.lastTime = time;
        this.wasmDraw(time, timeDelta,
            this.mousePos[0], this.mousePos[1], this.mouseDown,
            this.bigBrush);

        this.requestAnim();
    }
}

customElements.define("sand-component", SandComponent);