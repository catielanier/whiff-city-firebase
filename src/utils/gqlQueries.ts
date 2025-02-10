export const tournamentQuery = `
    query Tournament($slug: String) {
        tournament(slug: $slug) {
            id
        }
    }
`

export const streamQueueQuery = `
    query StreamQueue($tournamentId: ID!) {
        streamQueue(tournamentId: $tournamentId) {
            id
            sets {
                id
                slots {
                    id
                    entrant {
                        id
                        team {
                            id
                            name
                        }
                        name
                    }
                }
                event {
                    videogame {
                        name
                        displayName
                        id
                    }
                }
            }
        }
    }
`