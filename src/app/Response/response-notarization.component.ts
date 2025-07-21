import { Component, Input, OnInit } from '@angular/core';
import {
  MatDatepickerModule,
  MatCalendarView,
} from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { NotarizationAppointmentService } from '../shared/service/notarization-appointment.service';
import { ChangeDetectorRef } from '@angular/core';
import { formatDate } from '@angular/common';

@Component({
  selector: 'response-notarization',
  templateUrl: 'response-notarization.component.html',
  styleUrls: ['response-notarization.component.css'],
  standalone: true,
  imports: [
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    MatButtonModule,
    CommonModule,
  ],
  providers: [provideNativeDateAdapter()],
})
export class ResponseNotarizationComponent implements OnInit {
  @Input() sourceIdParam?: string | undefined | null;
  @Input() responseIdParam?: string | undefined | null;
  selectedDate: Date | null = null;
  selectedTime: string | null = null;
  blockedDates: Date[] = [];
  blockedDatesSet: Set<string> = new Set();
  isBlockedDatesLoaded = false;

  constructor(
    private notarizationService: NotarizationAppointmentService,
    private cdr: ChangeDetectorRef
  ) {}

  availableTimeSlots: { display: string }[] = [];

  private formatDateToString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // ngOnInit(): void {
  //   this.notarizationService
  //     .GetBlockedDates('2025-07-01', '2025-07-31')
  //     .subscribe({
  //       next: (bookedDates: string[]) => {
  //         console.log('Setting blocked dates:', bookedDates);
  //         this.blockedDatesSet = new Set(bookedDates);
  //         this.isBlockedDatesLoaded = true;
  //         this.cdr.detectChanges();
  //       },
  //       error: (err) => {
  //         console.error('Error fetching blocked dates:', err);
  //         this.isBlockedDatesLoaded = true;
  //       },
  //     });
  // }

  ngOnInit(): void {
    const today = new Date();
    this.loadBlockedDatesForMonth(today);
  }

  loadBlockedDatesForMonth(date: Date): void {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const startStr = startOfMonth.toISOString().split('T')[0];
    const endStr = endOfMonth.toISOString().split('T')[0];
    console.log('startStr:', startStr, 'endStr:', endStr);
    this.notarizationService.GetBlockedDates(startStr, endStr).subscribe({
      next: (bookedDates: string[]) => {
        console.log('Setting blocked dates:', bookedDates);
        this.blockedDatesSet = new Set(bookedDates);
        this.isBlockedDatesLoaded = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching blocked dates:', err);
        this.isBlockedDatesLoaded = true;
      },
    });
  }

  loadTimeSlotsForDate(date: Date | null): void {
    if (!date) {
      this.availableTimeSlots = [];
      return;
    }

    const formattedDate = date.toISOString().split('T')[0];

    this.notarizationService.GetOpenTimeSlots(formattedDate).subscribe({
      next: (slots) => {
        console.log('slots', slots);

        this.availableTimeSlots = slots.map((slot: any) => {
          // If slot is a string like "09:00:00-09:30:00", split it accordingly
          let startTimeStr: string, endTimeStr: string;
          if (typeof slot === 'string') {
            [startTimeStr, endTimeStr] = slot.split('-').map((s) => s.trim());
          } else {
            startTimeStr = slot.startTime;
            endTimeStr = slot.endTime;
          }

          const today = new Date();
          const [sh, sm, ss] = startTimeStr.split(':').map(Number);
          const [eh, em, es] = endTimeStr.split(':').map(Number);

          const start = new Date(today);
          start.setHours(sh, sm, ss || 0);

          const end = new Date(today);
          end.setHours(eh, em, es || 0);

          const startFormatted = formatDate(start, 'hh:mm a', 'en-US');
          const endFormatted = formatDate(end, 'hh:mm a', 'en-US');

          return {
            display: `${startFormatted} - ${endFormatted}`,
            rawSlot: slot,
          };
        });

        this.selectedTime = null;
      },
      error: (err) => {
        console.error('Failed to fetch time slots', err);
        this.availableTimeSlots = [];
      },
    });
  }

  onDateChange(date: Date | null) {
    this.selectedDate = date;
    this.loadTimeSlotsForDate(date);
  }

  myFilter = (d: Date | null): boolean => {
    const date = d || new Date();
    const dateStr = this.formatDateToString(date);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isPast = date < today;
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    if (!this.isBlockedDatesLoaded) {
      return !isWeekend;
    }

    const isBooked = this.blockedDatesSet.has(dateStr);

    return !isWeekend && !isPast && !isBooked;
  };

  selectTime(time: string) {
    this.selectedTime = time;
  }

  confirmSelection(): void {
    if (!this.selectedDate || !this.selectedTime) {
      console.warn('Date or time not selected');
      return;
    }

    const appointmentDate = this.selectedDate.toISOString(); // e.g., 2025-07-09T00:00:00Z

    // selectedTime = "11:30AM - 12:00PM"
    const [start, end] = this.selectedTime.split(' - ');

    const startTime = this.convertTo24HourFormat(start); // "11:30:00"
    const endTime = this.convertTo24HourFormat(end); // "12:00:00"

    this.notarizationService
      .SaveNotarizationAppointment(appointmentDate, startTime, endTime)
      .subscribe({
        next: (response) => {
          if (response.isSuccess) {
            console.log('Appointment created with ID:', response.appointmentId);
          } else {
            console.error('Failed to create appointment');
          }
        },
        error: (err) => {
          console.error('API error:', err);
        },
      });
  }

  convertTo24HourFormat(time12h: string): string {
    const [time, modifier] = time12h.split(/(AM|PM)/);
    let [hours, minutes] = time.trim().split(':').map(Number);

    if (modifier === 'PM' && hours !== 12) {
      hours += 12;
    }
    if (modifier === 'AM' && hours === 12) {
      hours = 0;
    }

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:00`;
  }
}
