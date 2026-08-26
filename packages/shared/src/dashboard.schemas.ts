export interface DashboardOrderSummary {
  id: string;
  reference: string;
  modelName: string;
  status: string;
  priority: string;
  dueDate: string;
  customer: { firstName: string; lastName: string };
}

export interface DashboardAppointmentSummary {
  id: string;
  title: string;
  type: string;
  startAt: string;
  customer: { firstName: string; lastName: string } | null;
}

export interface DashboardTaskSummary {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  order: { reference: string };
  assignedTo: { id: string; fullName: string } | null;
}

export interface DashboardToday {
  appointments: DashboardAppointmentSummary[];
  dueOrders: DashboardOrderSummary[];
  myTasks: DashboardTaskSummary[];
}

export interface DashboardUrgent {
  lateOrders: DashboardOrderSummary[];
  dueSoonOrders: DashboardOrderSummary[];
  urgentIssues: { id: string; title: string; category: string }[];
}

export interface DashboardMoney {
  totalDebt: number;
  debtorsCount: number;
  revenueThisMonth: number;
}

export interface DashboardStock {
  lowStockFabrics: { id: string; name: string; quantity: number; unit: string }[];
}

export interface DashboardTeam {
  tasksByAssignee: {
    userId: string;
    fullName: string;
    pendingCount: number;
    tasks: DashboardTaskSummary[];
  }[];
}

export interface DashboardResponse {
  today: DashboardToday;
  urgent: DashboardUrgent;
  money: DashboardMoney | null;
  stock: DashboardStock;
  team: DashboardTeam | null;
}
