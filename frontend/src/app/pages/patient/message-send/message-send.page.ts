import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminShellComponent } from '../../../components/admin-shell/admin-shell.component';

@Component({
  selector: 'app-message-send',
  standalone: true,
  imports: [CommonModule, AdminShellComponent],
  templateUrl: './message-send.page.html',
  styleUrls: ['./message-send.page.scss'],
})
export class MessageSendPage {}
