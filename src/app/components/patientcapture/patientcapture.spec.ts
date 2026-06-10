import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Patientcapture } from './patientcapture';

describe('Patientcapture', () => {
  let component: Patientcapture;
  let fixture: ComponentFixture<Patientcapture>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Patientcapture],
    }).compileComponents();

    fixture = TestBed.createComponent(Patientcapture);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
