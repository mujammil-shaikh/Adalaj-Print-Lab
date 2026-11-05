/**
 * Adalaj Print Lab - Core Domain Types
 */

export type TravelDirection = 'Vertical' | 'Horizontal';
export type LayoutMode = 'Stack' | 'Strip';
export type OrientationCombination = 'Vertical+Stack' | 'Vertical+Strip' | 'Horizontal+Strip' | 'Horizontal+Stack';

export type MachineType = 
  | 'TIJ Inkjet' 
  | 'CIJ Inkjet' 
  | 'Piezo Inkjet' 
  | 'Laser Marker' 
  | 'Thermal Transfer' 
  | 'Direct Thermal' 
  | 'Hot Foil' 
  | 'Pad Printing' 
  | 'Screen Printing' 
  | 'Digital Printing';

export type SurfaceType = 
  | 'Pouch' 
  | 'Carton' 
  | 'Direct Product' 
  | 'Label / Sticker' 
  | 'Bottle / Jar' 
  | 'Film / Foil' 
  | 'Tube / Sachet' 
  | 'Component' 
  | 'Custom';

export type ColorChannel = 'Black' | 'White' | 'Cyan' | 'Magenta' | 'Yellow' | 'Spot 1' | 'Spot 2';

export interface Business {
  id: string;
  name: string;
  industry: string;
  currencySymbol: string;
  currencyPosition: 'prefix' | 'suffix';
  dateFormat: string;
  updatedAt: string;
}

export interface Brand {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  logoSvg?: string;
}

export interface Product {
  id: string;
  brandId: string;
  name: string;
  shortCode: string;
  batchPrefix: string;
  defaultShelfLifeMonths: number;
  allowedPackSizes: string[];
  notes?: string;
  archived?: boolean;
}

export interface SKU {
  id: string;
  productId: string;
  packType: string;
  packSize: string;      // e.g. "100 g", "500 g", "1 kg"
  netWeightGrams: number;
  unit: string;          // e.g. "g", "kg"
  mrp?: number;          // undefined if empty / "Needs MRP"
  barcode?: string;
  shelfLifeOverrideMonths?: number;
  templateId?: string;
  enabled: boolean;
}

export interface CaptionRowProfile {
  id: string;
  fieldKey: string;      // 'mrp' | 'batch' | 'net_wt' | 'mfd' | 'best_before' | 'rate_per_gm' | custom
  label: string;
  baselineMm: number;
  captionTextHeightMm: number;
  valueStartX: number;
  valueMaxWidthMm: number;
  targetValueTextHeightMm: number;
  yOffsetMm?: number;
}

export interface PackProfile {
  id: string;
  name: string;          // e.g. "100 g", "500 g", "Standard Carton"
  surfaceType: SurfaceType;
  packWidthMm?: number;
  packHeightMm?: number;
  referenceEdge: 'Top Seal' | 'Bottom Seal' | 'Left Seal' | 'Right Seal' | 'Edge';
  printWindowStartX: number;
  printWindowStartY: number;
  printWindowLengthMm: number;
  printWindowWidthMm: number;
  captionRows: CaptionRowProfile[];
  valueLinePitchMm: number;
  notes?: string;
  status: 'verified' | 'estimated from photo, ±1 mm, please verify' | 'Awaiting measurements';
  referencePhotoUrl?: string;
}

export interface MachineProfile {
  id: string;
  name: string;          // e.g. "R2D2-SX100"
  manufacturer: string;
  model: string;
  technology: MachineType;
  headWidthMm: number;   // e.g. 12.7 mm
  printBandMm: number;   // e.g. 12.5 mm
  defaultDpi: number;    // e.g. 300
  edgeBufferMm: number;  // e.g. 0.1 mm
  contentPaddingTopMm: number;
  contentPaddingBottomMm: number;
  contentPaddingLeftMm: number;
  contentPaddingRightMm: number;
  maxTravelLengthMm: number;
  minimumLegibleTextHeightMm: number;
  exportRotation: 0 | 90 | 180 | 270;
  mirrorX: boolean;
  mirrorY: boolean;
  feedOrigin: 'Top -> Bottom' | 'Bottom -> Top' | 'Left -> Right' | 'Right -> Left';
  inkSpreadCompensationPx: number;
  supportedChannels: ColorChannel[];
  notes?: string;
}

export interface MediaProfile {
  id: string;
  name: string;          // e.g. "Glossy Plastic Pouch", "Matte Paper", "Corrugated Box"
  substrate: string;
  preferredDpi: number;
  densityPercent: number;
  contrastPercent: number;
  dotGainCompensationPercent: number;
  notes?: string;
}

export type ObjectType = 
  | 'text' 
  | 'field' 
  | 'line' 
  | 'rectangle' 
  | 'rounded_rect' 
  | 'ellipse' 
  | 'symbol' 
  | 'image' 
  | 'barcode' 
  | 'qr';

export interface DesignObject {
  id: string;
  type: ObjectType;
  x: number;             // mm in document coordinates
  y: number;             // mm in document coordinates
  width: number;         // mm
  height: number;        // mm
  rotation: number;      // 0, 90, 180, 270
  content?: string;      // raw text or placeholder e.g. "{mrp}"
  fieldKey?: string;     // 'mrp' | 'batch' | 'net_wt' | 'mfd' | 'best_before' | 'rate_per_gm' | custom
  fontFamily: string;
  fontSizePt: number;
  fontSizeMm: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  letterSpacingMm: number;
  lineHeightMultiplier: number;
  horizontalStretchPercent: number; // Condensing: 75% - 100%
  alignment: 'left' | 'center' | 'right';
  uppercase: boolean;
  channel: ColorChannel;
  mirrorX: boolean;
  mirrorY: boolean;
  invert: boolean;
  locked: boolean;
  lockType?: 'all' | 'position' | 'size';
  lineIndex?: number;    // for stacked 6-line items
  imageDataUrl?: string; // for raster images or SVG data
  barcodeFormat?: 'CODE128' | 'EAN13' | 'QR';
}

export interface Template {
  id: string;
  name: string;          // e.g. "ADALAJ-6LINE"
  description?: string;
  version: number;
  status: 'Draft' | 'Review' | 'Approved' | 'Released';
  travel: TravelDirection;
  layout: LayoutMode;
  printCaptions: boolean;
  currencySymbol: string;
  currencyPosition: 'prefix' | 'suffix';
  lineGapMm: number;
  autoFlow: boolean;
  preventOverlap: boolean;
  respectPadding: boolean;
  objects: DesignObject[];
  customLengthMm?: number; // Configurable travel length (e.g. 35, 45, 80, 100, 150+ mm, unrestricted)
  customBandMm?: number;   // Configurable printhead band (e.g. 12.5, 12.7, 21.1, 25.0 mm)
  customWidthPx?: number;  // Direct 1:1 pixel width override (e.g. 249 px)
  customHeightPx?: number; // Direct 1:1 pixel height override (e.g. 1181 px)
  customDownloadOrientation?: '1to1' | 'rotate90' | 'rotate180' | 'rotate270';
  packSizeScope?: string;  // Normalized pack size, e.g. "100g", "500g"
  skuOverrideKey?: string; // Product + pack size key, e.g. "prod_adtp_500g"
  isPackSizeDefault?: boolean;
  isSkuOverride?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BatchAllocation {
  id: string;
  batchId: string;
  skuId: string;
  productId: string;
  packSize: string;
  allocatedKg: number;
  expectedPacks: number;
  mfd: string;
  bestBefore: string;
  mrpSnapshot?: number;
  ratePerGmSnapshot?: number;
  templateVersionSnapshot: number;
  printStatus: 'Pending' | 'Proofed' | 'Printed';
  packsPrinted: number;
}

export interface Batch {
  id: string;            // e.g. "ADTP014"
  productId: string;
  rawMaterialKg: number;
  lotDate: string;
  status: 'Open' | 'Completed' | 'Archived' | 'Planned' | 'In Production' | 'Quarantined';
  notes?: string;
  allocations: BatchAllocation[];
  createdAt: string;
}

export interface PrintTransform {
  originX: 'left' | 'right';
  originY: 'top' | 'bottom';
  rotation: 0 | 90 | 180 | 270;
  mirrorX: boolean;
  mirrorY: boolean;
  scaleX: number;
  scaleY: number;
  translationXMm: number;
  translationYMm: number;
  registrationOffsetMm: number;
  feedDirection: 'Top -> Bottom' | 'Bottom -> Top' | 'Left -> Right' | 'Right -> Left';
}

export interface PassDefinition {
  passNumber: number;
  objectIds: string[];
  linesSummary: string;
  startOffsetMm: number;
  travelLengthMm: number;
  direction: TravelDirection;
  rotation: number;
  fileName: string;
}

export interface PassPlan {
  totalPasses: number;
  passes: PassDefinition[];
  oneLineReason: string;
}

export interface PrintJob {
  id: string;
  jobCode: string;
  businessName: string;
  brandName: string;
  productName: string;
  skuSize: string;
  batchId: string;
  quantityPacks: number;
  completedQuantity: number;
  rejectedQuantity: number;
  proofStatus: 'Not Tested' | 'Test Printed' | 'Verified' | 'Production Ready';
  productionStatus: 'Queued' | 'Printing' | 'Completed' | 'Paused';
  machineId: string;
  machineName: string;
  surfaceProfileName: string;
  travel: TravelDirection;
  layout: LayoutMode;
  passPlan: PassPlan;
  transform: PrintTransform;
  templateSnapshot: Template;
  valuesSnapshot: Record<string, string>;
  exportedFiles: { name: string; sizeBytes: number; type: string }[];
  operatorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  user: string;
  undoable: boolean;
  stateBefore?: unknown;
  stateAfter?: unknown;
}

export type DesignScope = 'This SKU' | 'Selected SKUs' | 'All SKUs of this pack size' | 'All SKUs';

export interface ActionDefinition {
  id: string;
  label: string;
  area: 'Global' | 'Navigation' | 'Designer' | 'Batch' | 'Print' | 'Settings';
  scope: 'global' | 'page' | 'panel' | 'dialog';
  shortcut?: string;
  altShortcuts?: string[];
  hintKey?: string;
  enabled: boolean;
  handler: () => void;
  tooltip: string;
  ariaKeyshortcuts?: string;
}

export * from '../domain/looseStock';

