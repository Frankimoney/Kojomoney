export default function Custom404() {
    return (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            minHeight: '100vh', 
            backgroundColor: '#0f172a', 
            color: 'white' 
        }}>
            <h1 style={{ fontSize: '4rem', marginBottom: '1rem' }}>404</h1>
            <p style={{ marginBottom: '2rem', color: '#94a3b8' }}>Page not found</p>
            <a href="/" style={{ 
                padding: '0.75rem 1.5rem', 
                backgroundColor: '#6366f1', 
                borderRadius: '0.5rem',
                textDecoration: 'none',
                color: 'white'
            }}>
                Go Home
            </a>
        </div>
    )
}
