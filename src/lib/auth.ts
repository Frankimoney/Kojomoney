import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'Email Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
        name: { label: 'Name', type: 'text', optional: true },
      },
      async authorize(credentials) {
        const email = (credentials?.email || '').trim().toLowerCase()
        if (!email) return null
        // Basic allow-list: any email logs in for demo purposes
        const user = { id: email, email, name: credentials?.name || email }
        return user
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id as string
        token.email = user.email as string
        token.name = user.name as string
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.sub as string) || (token.email as string) || session.user.email || ''
        session.user.email = (token.email as string) || session.user.email || ''
        session.user.name = (token.name as string) || session.user.name || ''
      }
      return session
    },
  },
}

