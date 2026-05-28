import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/superadmin/', '/api/', '/kitchen/', '/manager/'],
      },
    ],
    sitemap: 'https://bicres.com/sitemap.xml',
  }
}
