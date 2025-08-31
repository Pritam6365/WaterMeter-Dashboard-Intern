import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Chart6Component } from './chart6.component';

describe('Chart6Component', () => {
  let component: Chart6Component;
  let fixture: ComponentFixture<Chart6Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Chart6Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Chart6Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
