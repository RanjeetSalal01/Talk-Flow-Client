import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NameInitials } from './name-initials';

describe('NameInitials', () => {
  let component: NameInitials;
  let fixture: ComponentFixture<NameInitials>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NameInitials]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NameInitials);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
