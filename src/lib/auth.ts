import { AuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import sql from '@/lib/db'

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email) {
        await sql.query(
          `INSERT INTO users (google_id, email, name)
           VALUES ($1, $2, $3)
           ON CONFLICT (google_id) DO UPDATE SET email = $2, name = $3`,
          [user.id, user.email, user.name ?? '']
        )
      }
      return true
    },
    async jwt({ token, account }) {
      // On first sign-in, fetch our internal user id
      if (account && token.sub) {
        const rows = await sql.query(
          'SELECT id FROM users WHERE google_id = $1',
          [token.sub]
        )
        if (rows[0]) token.userId = rows[0].id as string
      }
      return token
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
}
