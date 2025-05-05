// src/components/SEO.tsx
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { settingsService, SiteSettings, Banner, SocialMedia } from '../services/settings.service'; // Adjust the import path

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  bannerId?: number;
}

const SEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords,
  image,
  url,
  bannerId,
}) => {
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({});
  const [banners, setBanners] = useState<Banner[]>([]);
  const [socialMedia, setSocialMedia] = useState<SocialMedia[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settings, bannerData, socialMediaData] = await Promise.all([
          settingsService.getSettings(),
          settingsService.getBanners(true),
          settingsService.getSocialMedia(true),
        ]);
        setSiteSettings(settings);
        setBanners(bannerData);
        setSocialMedia(socialMediaData);
      } catch (error) {
        console.error('Failed to fetch SEO data:', error);
      }
    };
    fetchData();
  }, []);

  const defaultTitle = siteSettings.restaurant_name || 'Your Restaurant Name';
  const defaultDescription =
    siteSettings.restaurant_description ||
    'Discover delicious meals at our restaurant.';
  const defaultKeywords = keywords || 'restaurant, dining, food, menu';
  const defaultImage =
    siteSettings.restaurant_logo || '/path/to/default-image.jpg';
  const defaultUrl = url || window.location.href;

  const selectedBanner = bannerId
    ? banners.find((banner) => banner.id === bannerId)
    : banners[0];
  const bannerTitle = selectedBanner?.title;
  const bannerDescription = selectedBanner?.subtitle;
  const bannerImage = selectedBanner?.image_url;

  const finalTitle = title || bannerTitle || defaultTitle;
  const finalDescription = description || bannerDescription || defaultDescription;
  const finalImage = image || bannerImage || defaultImage;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: siteSettings.restaurant_name || 'Your Restaurant Name',
    description: siteSettings.restaurant_description || defaultDescription,
    telephone: siteSettings.phone_number || '',
    address: siteSettings.address || '',
    url: defaultUrl,
    image: finalImage,
  };

  return (
    <Helmet>
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      <meta name="keywords" content={defaultKeywords} />
      <meta name="author" content={siteSettings.restaurant_name || 'Your Restaurant Name'} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:image" content={finalImage} />
      <meta property="og:url" content={defaultUrl} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={finalImage} />
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
    </Helmet>
  );
};

export default SEO;