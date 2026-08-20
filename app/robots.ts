import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Auth forms, tokened invite links, the session diagnostic and the
      // post-purchase pages. None have search value, and /claim URLs carry a
      // single-use token that must never end up in an index.
      disallow: ['/dashboard', '/api', '/auth', '/login', '/claim', '/whoami', '/checkout'],
    },
    sitemap: 'https://getforged.getbrian.xyz/sitemap.xml',
  }
}
