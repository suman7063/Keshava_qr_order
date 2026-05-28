import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/superadmin/', '/api/', '/kitchen/', '/manager/', '/table/'],
      },
    ],
    sitemap: 'https://bicres.com/sitemap.xml',
  }
}
