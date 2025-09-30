import {
  ApplicationRef,
  createComponent,
  Injectable,
  Injector,
} from '@angular/core';
import { CustomTooltipComponent } from '../../Response/CustomTooltip/custom-tooltip.component';

@Injectable({ providedIn: 'root' })
export class TooltipService {
  private tooltipRef: any;
  private currentAnchor: HTMLElement | null = null;
  private isHoveringTooltip = false;
  private isHoveringAnchor = false;
  private hideTimeout: any;
  private tooltipVisible = false;

  constructor(private appRef: ApplicationRef, private injector: Injector) {}

  showTooltip(
    anchor: HTMLElement,
    headerText: string,
    bodyText: string,
    width: string,
    subtext?: string,
    subtextTwo?: string,
    actionLabel?: string,
    onAction?: (() => void) | undefined,
    onClose?: (() => void) | undefined,
    transformStyle?: string,
    showCloseButton: boolean = true,
    showActionButton: boolean = true
  ) {
    if (this.tooltipVisible) return;

    this.tooltipVisible = true;

    const tooltip = createComponent(CustomTooltipComponent, {
      environmentInjector: this.appRef.injector,
      elementInjector: this.injector,
    });

    tooltip.instance.headerText = headerText;
    tooltip.instance.bodyText = bodyText;
    tooltip.instance.subtext = subtext ?? '';
    tooltip.instance.subtextTwo = subtextTwo ?? '';
    tooltip.instance.actionLabel = actionLabel;
    tooltip.instance.width = width;
    tooltip.instance.transformStyle =
      transformStyle || 'translate(-50%, -100%)';
    tooltip.instance.showCloseButton = showCloseButton;
    tooltip.instance.showActionButton = showActionButton;

    tooltip.instance.mouseEnter.subscribe(() => {
      this.isHoveringTooltip = true;
      clearTimeout(this.hideTimeout);
    });
    tooltip.instance.mouseLeave.subscribe(() => {
      this.isHoveringTooltip = false;
      this.scheduleHideTooltip();
    });

    tooltip.instance.close.subscribe(() => this.hideTooltip());
    tooltip.instance.action.subscribe(() => {
      if (onAction) {
        onAction();
      }
      this.hideTooltip();
    });

    this.appRef.attachView(tooltip.hostView);
    document.body.appendChild(tooltip.location.nativeElement);
    this.tooltipRef = tooltip;

    const rect = anchor.getBoundingClientRect();
    const el = tooltip.location.nativeElement as HTMLElement;
    el.style.position = 'fixed';
    el.style.left = `${rect.left + rect.width / 2}px`;
    el.style.top = `${rect.top}px`;
    el.style.transform = 'translate(-50%, -100%)';
    el.style.zIndex = '1000';

    this.currentAnchor = anchor;
    anchor.addEventListener('mouseenter', this.onAnchorEnter);
    anchor.addEventListener('mouseleave', this.onAnchorLeave);
  }

  private onAnchorEnter = () => {
    this.isHoveringAnchor = true;
    clearTimeout(this.hideTimeout);
  };

  private onAnchorLeave = () => {
    this.isHoveringAnchor = false;
    this.scheduleHideTooltip();
  };

  scheduleHideTooltip() {
    clearTimeout(this.hideTimeout);
    this.hideTimeout = setTimeout(() => {
      if (!this.isHoveringTooltip && !this.isHoveringAnchor) {
        this.hideTooltip();
      }
    }, 150);
  }

  hideTooltip() {
    if (this.tooltipRef) {
      this.appRef.detachView(this.tooltipRef.hostView);
      this.tooltipRef.destroy();
      this.tooltipRef = null;
    }

    if (this.currentAnchor) {
      this.currentAnchor.removeEventListener('mouseenter', this.onAnchorEnter);
      this.currentAnchor.removeEventListener('mouseleave', this.onAnchorLeave);
      this.currentAnchor = null;
    }

    this.isHoveringTooltip = false;
    this.isHoveringAnchor = false;
    this.tooltipVisible = false;
  }
}
