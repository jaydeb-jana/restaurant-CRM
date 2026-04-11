import { staticBranding, useBranding, BrandingConfig } from '../context/BrandingContext';

export { useBranding };
export type { BrandingConfig };

export const branding: BrandingConfig = staticBranding;

export default branding;
