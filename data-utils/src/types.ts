/** Base attribute definition for a model field */
export interface ModelAttribute {
  name: string;
  type: string;
  default?: unknown;
  editable?: boolean;
  help_text?: string;
  description?: string;
  options?: unknown;
  filter?: boolean;
  filter_empty?: unknown;
  filter_rule?: string;
  stats?: boolean;
  groupBy?: string;
  [key: string]: unknown;
}

/** Model definition with attributes and optional API endpoints */
export interface ModelData {
  model_name?: string;
  model_attributes: ModelAttribute[];
  add_api_url?: string;
  update_api_url?: string;
  delete_api_url?: string;
  [key: string]: unknown;
}

/** Standard row shape for data tables */
export interface RowData {
  id: string | number;
  time_created?: string;
  time_updated?: string;
  [key: string]: unknown;
}
