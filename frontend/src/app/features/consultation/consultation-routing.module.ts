
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ConsultationFormComponent } from './consultation-form/consultation-form.component';
import { ConsultationViewComponent } from './consultation-view/consultation-view.component';

const routes: Routes = [
  {
    path: 'add/:appointmentId',
    component: ConsultationFormComponent
  },
  {
    path: 'view/:appointmentId',
    component: ConsultationViewComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ConsultationRoutingModule { }
