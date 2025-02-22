export const tournamentQuery = `
    query Tournament($slug: String) {
        tournament(slug: $slug) {
            id
        }
    }
`

export const streamQueueQuery = `
    query TournamentQuery($tournamentId: ID!) {
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