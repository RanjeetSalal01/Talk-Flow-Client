import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { AppService } from '../../core/services/app.service';
import { AuthService } from '../../core/services/auth.service';
import { API } from '../../core/config/api';
import { NameInitials } from '../../shared/components/name-initials/name-initials';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, SharedModule, ReactiveFormsModule, NameInitials],
  templateUrl: './profile.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Profile implements OnInit {

  isEditing = false;
  saving = false;
  avatarPreview: string | null = null;
  selectedFile: File | null = null;

  form = new FormGroup({
    fullName: new FormControl(''),
    bio: new FormControl(''),
  });

  constructor(
    public auth: AuthService,
    private app: AppService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.form.patchValue({
      fullName: this.auth.user()?.fullName ?? '',
      bio: this.auth.user()?.bio ?? '',
    });
    this.form.disable();
  }

  edit(): void {
    this.isEditing = true;
    this.form.enable();
    this.cdr.detectChanges();
  }

  cancel(): void {
    this.isEditing = false;
    this.avatarPreview = null;
    this.selectedFile = null;
    this.form.patchValue({
      fullName: this.auth.user()?.fullName ?? '',
      bio: this.auth.user()?.bio ?? '',
    });
    this.form.disable();
    this.cdr.detectChanges();
  }

  onAvatarClick(): void {
    if (this.isEditing) document.getElementById('avatarInput')?.click();
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.selectedFile = file;
    this.avatarPreview = URL.createObjectURL(file);
    this.cdr.detectChanges();
  }

  save(): void {
    this.saving = true;
    this.cdr.detectChanges();

    const formData = new FormData();
    formData.append('fullName', this.form.value.fullName ?? '');
    formData.append('bio', this.form.value.bio ?? '');
    if (this.selectedFile) formData.append('avatar', this.selectedFile);

    this.app.patch<any>(API.endPoint.updateUser, formData).subscribe({
      next: (res) => {
        this.auth.user.set({ ...this.auth.user(), ...res });
        this.isEditing = false;
        this.saving = false;
        this.selectedFile = null;
        this.avatarPreview = null;
        this.form.disable();
        this.cdr.detectChanges();
      },
      error: () => {
        this.saving = false;
        this.cdr.detectChanges();
      }
    });
  }
}