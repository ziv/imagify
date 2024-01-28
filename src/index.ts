function* pair(org: HTMLElement, cloned: HTMLElement): Generator<[HTMLElement, HTMLElement]> {
    function* next(node: HTMLElement): Generator<HTMLElement> {
        yield node;
        for (let i = 0, l = node.childNodes.length; i < l; ++i) {
            yield* next(node.childNodes[i] as HTMLElement);
        }
    }
    const itr = next(cloned);
    for (const orig of next(org)) {
        const cloned = itr.next().value;
        yield [orig, cloned];
    }
}

const imageFromUrl = (url: string) => new Promise<HTMLImageElement>((resolve) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.src = url;
});

const canvasToUrl = (canvas: HTMLCanvasElement) => canvas.toDataURL('image/png', 1);

const imageToCanvas = (img: HTMLImageElement) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.offsetHeight;
    canvas.getContext('2d')?.drawImage(img, 0, 0);
    return canvas;
}

export interface ImagifyOptions {
    height?: number;
    width?: number;
    size?: number;
}

// todo image type and quality should be optional?
// todo copy image - research with impl is better (canvas, or fetch)

/**
 * Convert HTMLElement to SVG string
 * @todo add support for remote resources
 * @todo add support for frames
 * @todo add support for shadow
 *
 * @param node HTMLElement
 * @param options ImagifyOptions
 */
export async function toSvg(node: HTMLElement, options?: ImagifyOptions) {
    let {
        width = node.offsetWidth,
        height = node.offsetHeight,
        size = 1
    } = options ?? {};
    if (size !== 1) {
        width = width * size;
        height = height * size;
    }
    const copy = node.cloneNode(true) as HTMLElement;
    for (const [org, cloned] of pair(node, copy)) {
        // content
        if (org instanceof HTMLCanvasElement) {
            cloned.replaceWith(await imageFromUrl(canvasToUrl(org)));
        } else if (org instanceof HTMLImageElement) {
            cloned.replaceWith(await imageFromUrl(canvasToUrl(imageToCanvas(org))));
        } else if (org instanceof HTMLInputElement) {
            cloned.setAttribute('value', org.value);
        } else if (org instanceof HTMLTextAreaElement) {
            cloned.innerHTML = org.value;
        }
        // style
        if (org instanceof Element) {
            const computed = getComputedStyle(org) as CSSStyleDeclaration & Iterable<any>;
            for (const name of computed) {
                cloned.style.setProperty(name, computed.getPropertyValue(name), computed.getPropertyPriority(name));
            }
        }
    }
    copy.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
    const raw = new XMLSerializer()
        .serializeToString(copy)
        .replace(/%/g, '%25')
        .replace(/#/g, '%23')
        .replace(/\n/g, '%0A');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject x="0" y="0" width="100%" height="100%">${raw}</foreignObject></svg>`
}