import { Component } from '@angular/core';
import { Sidebar } from '../../shared/components/sidebar/sidebar';
import { RouterOutlet } from '@angular/router';
import { CallModal } from '../../shared/components/call-modal/call-modal';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [Sidebar, RouterOutlet, CallModal],
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent {

}
