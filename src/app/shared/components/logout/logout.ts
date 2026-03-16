import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-logout',
  imports: [],
  templateUrl: './logout.html',
  styleUrl: './logout.css',
})
export class Logout {
  constructor(private ref: MatDialogRef<Logout>) {}

  close(confirmed: boolean): void {
    this.ref.close(confirmed);
  }
}
