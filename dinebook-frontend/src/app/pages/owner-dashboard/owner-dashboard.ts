import { Component } from "@angular/core"
import { CommonModule } from "@angular/common"

@Component({
    selector: "app-owner-dashboard",
    standalone: true,
    imports: [CommonModule],
    templateUrl: "./owner-dashboard.html",
    styleUrl: "./owner-dashboard.scss",
})
export class OwnerDashboardComponent {
    constructor() { }
}
