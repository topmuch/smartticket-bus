export interface MockDeparture {
  line: string;
  lineColor: string;
  direction: string;
  departure: string;
  arrival: string;
  durationMin: number;
  status: 'upcoming' | 'boarding' | 'completed';
  stopsCount: number;
}

export const mockScheduleData: MockDeparture[] = [
  {
    line: "L10",
    lineColor: "#2563eb",
    direction: "Gare Centrale → Université",
    departure: "14:35",
    arrival: "14:52",
    durationMin: 17,
    status: "upcoming",
    stopsCount: 8
  },
  {
    line: "L10",
    lineColor: "#2563eb",
    direction: "Gare Centrale → Université",
    departure: "14:55",
    arrival: "15:12",
    durationMin: 17,
    status: "upcoming",
    stopsCount: 8
  },
  {
    line: "L24",
    lineColor: "#10b981",
    direction: "Stade Municipal → Centre Commercial",
    departure: "14:40",
    arrival: "14:58",
    durationMin: 18,
    status: "boarding",
    stopsCount: 10
  },
  {
    line: "L05",
    lineColor: "#f59e0b",
    direction: "Aéroport T1 → Gare Routière",
    departure: "14:25",
    arrival: "14:45",
    durationMin: 20,
    status: "completed",
    stopsCount: 12
  },
  {
    line: "L24",
    lineColor: "#10b981",
    direction: "Centre Commercial → Stade Municipal",
    departure: "15:05",
    arrival: "15:23",
    durationMin: 18,
    status: "upcoming",
    stopsCount: 10
  },
  {
    line: "L08",
    lineColor: "#8b5cf6",
    direction: "Plateau → Liberté 6",
    departure: "14:30",
    arrival: "14:50",
    durationMin: 20,
    status: "completed",
    stopsCount: 11
  },
  {
    line: "L05",
    lineColor: "#f59e0b",
    direction: "Gare Routière → Aéroport T1",
    departure: "15:00",
    arrival: "15:20",
    durationMin: 20,
    status: "upcoming",
    stopsCount: 12
  },
  {
    line: "L08",
    lineColor: "#8b5cf6",
    direction: "Liberté 6 → Plateau",
    departure: "14:50",
    arrival: "15:10",
    durationMin: 20,
    status: "boarding",
    stopsCount: 11
  }
];

export const availableLines = [
  { code: "ALL", label: "Toutes les lignes" },
  { code: "L10", label: "Ligne 10", color: "#2563eb" },
  { code: "L24", label: "Ligne 24", color: "#10b981" },
  { code: "L05", label: "Ligne 5", color: "#f59e0b" },
  { code: "L08", label: "Ligne 8", color: "#8b5cf6" },
];
