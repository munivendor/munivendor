import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { ConfigService } from '../../core/services/config.service';

@Injectable({
  providedIn: 'root',
})
export class NotarizationAppointmentService {
  private get url(): string {
    return this.config.apiUrl;
  }

  constructor(
    private http: HttpClient,
    private config: ConfigService,
  ) {}

  GetOpenTimeSlots(
    date: string,
    interval?: number,
    workDayStart?: string,
    workDayEnd?: string,
  ): Observable<string[]> {
    let params = new HttpParams();

    if (interval != null) {
      params = params.set('timeSlotInterval', interval.toString());
    }
    if (workDayStart) {
      params = params.set('workDayStart', workDayStart);
    }
    if (workDayEnd) {
      params = params.set('workDayEnd', workDayEnd);
    }

    return this.http
      .get<{
        timeSlots: string[];
      }>(`${this.url}NotarizationAppointments/OpenTimeSlots/${date}`, {
        params,
      })
      .pipe(map((response) => response.timeSlots));
  }

  GetBlockedDates(
    startDate: string,
    endDate: string,
    notaryId?: number,
    workDayStart?: string,
    workDayEnd?: string,
  ): Observable<string[]> {
    let params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    if (notaryId !== undefined && notaryId !== null) {
      params = params.set('notaryId', notaryId.toString());
    }

    if (workDayStart) {
      params = params.set('workDayStart', workDayStart);
    }

    if (workDayEnd) {
      params = params.set('workDayEnd', workDayEnd);
    }

    return this.http
      .get<{
        bookedDates: string[];
      }>(`${this.url}NotarizationAppointments/BlockedDates`, { params })
      .pipe(
        map((response) => {
          const processedDates = response.bookedDates.map((dateStr) => {
            const processed = dateStr.split('T')[0].trim();
            return processed;
          });
          return processedDates;
        }),
      );
  }

  SaveNotarizationAppointment(
    date: string,
    startTime: string,
    endTime: string,
  ): Observable<{ isSuccess: boolean; appointmentId: number }> {
    const params = new HttpParams()
      .set('date', date)
      .set('startTime', startTime)
      .set('endTime', endTime);

    return this.http.post<{ isSuccess: boolean; appointmentId: number }>(
      `${this.url}NotarizationAppointments`,
      null, // no body
      { params },
    );
  }
}
