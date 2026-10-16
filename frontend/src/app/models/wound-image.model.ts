export interface WoundImage {
  id: number;
  clientUuid?: string;
  imageData: string | null;
  overlayData: string | null;
  originalFilename: string;
  predictionLabel: string | null;
  confidence: number | null;
  detected: boolean;
  routeLabel: string | null;
  routeConf: number | null;
  wagnerLabel: string | null;
  wagnerConf: number | null;
  epuapLabel: string | null;
  epuapConf: number | null;
  ceapLabel: string | null;
  ceapConf: number | null;
  createdAt: string;
}
