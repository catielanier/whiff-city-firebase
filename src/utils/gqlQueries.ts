export const tournamentQuery = `
    query Tournament($slug: String) {
        tournament(slug: $slug) {
            id
        }
    }
`;

export const streamQueueQuery = `
    query TournamentQuery($tournamentId: ID!) {
    streamQueue(tournamentId: $tournamentId) {
        id
        stream {
          streamName
        }
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
            initialSeedNum
            participants {
              prefix
              user {
                authorizations {
                  externalUsername
                  type
                }
                genderPronoun
                location {
                  country
                }
              }
            }
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
`;
