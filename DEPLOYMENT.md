# Production Deployment Guide

## Pre-deployment Checklist

### ✅ Code Quality
- [x] Removed all console.log statements from production code
- [x] Console.error statements retained for error tracking
- [x] Development-only components conditionally rendered
- [x] TestPage excluded from production builds
- [x] DebugPanel not used in production

### ✅ Build Configuration
- [x] Source maps disabled for security
- [x] Terser minification enabled
- [x] Console statements automatically removed in production
- [x] Manual chunk splitting for better caching
- [x] Environment variables properly configured

### ✅ Security
- [x] No sensitive data in client-side code
- [x] Environment variables for API keys
- [x] RLS policies properly configured
- [x] Error boundaries in place

## Build Commands

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Environment Variables

Create a `.env.production` file with the following variables:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
```

## Deployment Platforms

### Vercel (Recommended)
1. Connect your GitHub repository
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Netlify
1. Connect your GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Configure environment variables

### Manual Deployment
1. Run `npm run build`
2. Upload `dist` folder contents to your web server
3. Configure server to serve `index.html` for all routes

## Performance Optimizations

- ✅ Code splitting implemented
- ✅ Lazy loading for development components
- ✅ Image optimization recommended
- ✅ CDN usage recommended for static assets

## Monitoring

### Error Tracking
- Console errors are logged for debugging
- Error boundaries catch React errors
- Consider implementing error tracking service (Sentry, etc.)

### Performance Monitoring
- Performance monitor tracks slow operations
- Only logs warnings in development mode
- Consider implementing analytics

## Security Checklist

- [x] No sensitive data in client-side code
- [x] API keys in environment variables
- [x] HTTPS enforced
- [x] Content Security Policy (CSP) recommended
- [x] Rate limiting on API endpoints
- [x] Input validation on all forms

## Post-deployment

1. Test all user flows
2. Verify payment integration
3. Check error logging
4. Monitor performance metrics
5. Set up monitoring alerts

## Rollback Plan

1. Keep previous deployment version
2. Use platform-specific rollback features
3. Database migrations should be reversible
4. Test rollback procedure

## Support

For deployment issues, check:
1. Environment variables configuration
2. Build logs for errors
3. Network connectivity
4. Database connection
5. API endpoint availability 