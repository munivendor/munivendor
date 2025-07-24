import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class NotarizationAppointmentService {
  private url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  GetOpenTimeSlots(
    date: string, // e.g., "2025-07-10"
    interval?: number, // e.g., 15
    workDayStart?: string, // e.g., "09:00:00"
    workDayEnd?: string // e.g., "17:00:00"
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
      .get<{ timeSlots: string[] }>(
        `${this.url}NotarizationAppointments/OpenTimeSlots/${date}`,
        { params }
      )
      .pipe(map((response) => response.timeSlots));
  }

  GetBlockedDates(
    startDate: string,
    endDate: string,
    notaryId?: number,
    workDayStart?: string,
    workDayEnd?: string
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
      .get<{ bookedDates: string[] }>(
        `${this.url}NotarizationAppointments/BlockedDates`,
        { params }
      )
      .pipe(
        map((response) => {
          const processedDates = response.bookedDates.map((dateStr) => {
            const processed = dateStr.split('T')[0].trim();
            return processed;
          });
          return processedDates;
        })
      );
  }

  SaveNotarizationAppointment(
    date: string,
    startTime: string,
    endTime: string
  ): Observable<{ isSuccess: boolean; appointmentId: number }> {
    const params = new HttpParams()
      .set('date', date)
      .set('startTime', startTime)
      .set('endTime', endTime);

    return this.http.post<{ isSuccess: boolean; appointmentId: number }>(
      `${this.url}NotarizationAppointments`,
      null, // no body
      { params }
    );
  }
}
