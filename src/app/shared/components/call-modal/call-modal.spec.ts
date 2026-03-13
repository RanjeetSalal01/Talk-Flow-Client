import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CallModal } from './call-modal';

describe('CallModal', () => {
  let component: CallModal;
  let fixture: ComponentFixture<CallModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CallModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CallModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
