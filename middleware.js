import { NextResponse } from 'next/server'

export function middleware(request) {
    const hostname = request.headers.get('host') || ''
    const url = request.nextUrl.clone()

    // Strip port if present
    const host = hostname.split(':')[0]

    // Extract all parts of the subdomain
    // e.g. "www.steam.com.checkgift.store" → ["www", "steam", "com"]
    // e.g. "apple.checkgift.store" → ["apple"]
    // e.g. "checkgift.store" → ["checkgift"] (root - no redirect)
    const parts = host.replace('.checkgift.store', '').split('.')

    // Subdomain-to-legacy mapping
    const subdomainMap = {
        'apple': '/apple-legacy',
        'steam': '/steam-legacy',
        'razer': '/razer-legacy',
        'visa': '/visa-legacy',
    }

    // Check if ANY part of the subdomain matches a card type keyword
    const matchedType = parts.find(p => subdomainMap[p])

    // Only redirect if a card type keyword is found in the subdomain
    if (matchedType) {
        const destination = subdomainMap[matchedType]
        if (url.pathname !== destination) {
            url.pathname = destination
            return NextResponse.redirect(url, 308)
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        // Match all paths except static files and api
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
