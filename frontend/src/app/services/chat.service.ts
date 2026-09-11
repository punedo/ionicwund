import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ChatMessage, ChatRecipient } from '../models/chat-message.model';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getMessages(patientId: number): Observable<ChatMessage[]> {
    return this.http
      .get<{ messages: ChatMessage[] }>(`${this.apiUrl}/patients/${patientId}/chat-messages`)
      .pipe(
        map((res) => res.messages ?? []),
        catchError((err) => {
          console.error('[ChatService] getMessages error:', err);
          return of([]);
        })
      );
  }

  sendMessage(patientId: number, content: string, recipientId?: number | null): Observable<ChatMessage | null> {
    return this.http
      .post<ChatMessage>(`${this.apiUrl}/patients/${patientId}/chat-messages`, {
        content,
        recipientId: recipientId ?? null,
      })
      .pipe(
        catchError((err) => {
          console.error('[ChatService] sendMessage error:', err);
          return of(null);
        })
      );
  }

  getRecipients(): Observable<ChatRecipient[]> {
    const doctors$ = this.http
      .get<{ users: { id: number; fullName: string }[] }>(`${this.apiUrl}/users?role=ROLE_ARZT`)
      .pipe(map((res) => (res.users ?? []).map((u) => ({ id: u.id, fullName: u.fullName, role: 'Arzt' }))));

    const woundExperts$ = this.http
      .get<{ users: { id: number; fullName: string }[] }>(`${this.apiUrl}/users?role=ROLE_PFLEGE`)
      .pipe(map((res) => (res.users ?? []).map((u) => ({ id: u.id, fullName: u.fullName, role: 'Wundexperte' }))));

    return forkJoin([doctors$, woundExperts$]).pipe(
      map(([doctors, woundExperts]) => [...doctors, ...woundExperts]),
      catchError((err) => {
        console.error('[ChatService] getRecipients error:', err);
        return of([]);
      })
    );
  }
}
