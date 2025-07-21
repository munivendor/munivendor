import { Directive, ElementRef, HostListener, Input } from '@angular/core';
import { TooltipService } from '../service/tooltip.service';

@Directive({
  selector: '[appTooltip]',
  standalone: true,
})
export class TooltipDirective {
  @Input('appTooltip') tooltipData!: {
    header: string;
    body: string;
    subtext?: string;
    subtextTwo?: string;
    actionLabel?: string;
    onAction?: () => void;
    onClose?: () => void;
    width: string;
    transformStyle?: string;
    showCloseButton?: boolean;
    showActionButton?: boolean;
  };

  private tooltipDelay: any;

  constructor(private el: ElementRef, private tooltipService: TooltipService) {}

  @HostListener('mouseenter')
  onMouseEnter() {
    if (this.tooltipDelay) clearTimeout(this.tooltipDelay);
    this.tooltipDelay = setTimeout(() => {
      this.tooltipService.showTooltip(
        this.el.nativeElement,
        this.tooltipData.header,
        this.tooltipData.body,
        this.tooltipData.width,
        this.tooltipData.subtext,
        this.tooltipData.subtextTwo,
        this.tooltipData.actionLabel,
        this.tooltipData.onAction,
        this.tooltipData.onClose,
        this.tooltipData.transformStyle,
        this.tooltipData.showCloseButton ?? true,
        this.tooltipData.showActionButton ?? true
      );
    }, 100);
  }

  @HostListener('mouseleave')
  onMouseLeave() {
    if (this.tooltipDelay) clearTimeout(this.tooltipDelay);
    this.tooltipService['scheduleHideTooltip']();
  }
}
