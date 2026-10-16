export interface WoundPrediction {
  label: string;
  confidence: number;
  detected: boolean;
  overlay: string | null;
  wagner_label: string | null;
  wagner_conf: number | null;
  route_label: string | null;
  route_conf: number | null;
  epuap_label: string | null;
  epuap_conf: number | null;
  ceap_label: string | null;
  ceap_conf: number | null;
}
