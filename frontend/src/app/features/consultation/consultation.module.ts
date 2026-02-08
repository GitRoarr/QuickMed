
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ConsultationFormComponent } from './consultation-form/consultation-form.component';
import { ConsultationViewComponent } from './consultation-view/consultation-view.component';
import { ConsultationRoutingModule } from './consultation-routing.module';

@NgModule({
  declarations: [
    ConsultationFormComponent,
    ConsultationViewComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ConsultationRoutingModule
  ]
})
export class ConsultationModule { }
