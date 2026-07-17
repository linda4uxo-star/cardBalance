export default function HomePage() {
    return null
}

export async function getServerSideProps(context) {
    try {
        const { supabase } = await import('../lib/supabase')
        
        const { data, error } = await supabase
            .from('app_settings')
            .select('active_landing_page')
            .eq('id', 1)
            .single()

        if (!error && data && data.active_landing_page) {
            const activePage = data.active_landing_page

            if (activePage === '404') {
                return { notFound: true }
            }

            return {
                redirect: {
                    destination: `/${activePage === 'index' ? 'visa-id' : activePage}`,
                    permanent: false,
                },
            }
        }
    } catch (error) {
        console.error('Error in getServerSideProps:', error)
    }

    return {
        redirect: {
            destination: `/visa-id`,
            permanent: false,
        },
    }
}
