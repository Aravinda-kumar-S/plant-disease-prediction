export interface PestInfo {
  name: string;
  description: string;
  remedy: string[];
}

export interface NutrientInfo {
  name: string;
  description: string;
  remedy: string[];
}

export interface EnvironmentalData {
  sunlight: string;
  watering: string;
  notes: string;
  organicPreference: boolean;
  location: {
    latitude: number;
    longitude: number;
  } | null;
}

export interface PredictionData {
  plantName: string;
  isHealthy: boolean;
  diseaseName: string;
  description: string;
  treatmentSuggestions: string[];
  benefits: string[];
  confidenceScore: number;
  preventativeCareTips: string[];
  progressAssessment: 'Improved' | 'Worsened' | 'Unchanged' | 'N/A';
  comparativeAnalysis: string;
  pestIdentification: PestInfo[];
  nutrientDeficiencies: NutrientInfo[];
}

export interface AnalysisRecord extends PredictionData {
  id: string; // unique ID for this analysis
  date: string; // ISO string date
  imageUrl: string; // data URL for the image
  environmentalData: EnvironmentalData;
}

export interface PlantProfile {
  id: string; // unique ID for the plant
  name: string;
  analysisHistory: AnalysisRecord[];
}