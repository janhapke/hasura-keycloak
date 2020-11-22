/*

This code was inspired by the following Tutorial:

https://hasura.io/learn/graphql/hasura/custom-business-logic/2-remote-schemas/

and then translated to work with Keycloak.

*/
const { ApolloServer } = require('apollo-server');
const gql = require('graphql-tag');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

process.on('SIGINT', process.exit);

const PORT = process.env.PORT || 3001;
const KEYCLOAK_HOST = process.env.KEYCLOAK_HOST || 'http://keycloak:8080';
const KEYCLOAK_ADMIN_USER = process.env.KEYCLOAK_ADMIN_USER || 'admin';
const KEYCLOAK_ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin';

const getKeycloakAdminToken = async (username, password) => {
    const response = await fetch(
        KEYCLOAK_HOST + '/auth/realms/master/protocol/openid-connect/token',
        {
            method: 'POST',
            body: new URLSearchParams({ username: username, password: password, grant_type: 'password', client_id: 'admin-cli' })
        }
    );
    const json = await response.json();
    return json.access_token;
}

const getKeycloakProfileInfo = async (user_id) => {
    const headers = {
        'Authorization': 'Bearer ' + await getKeycloakAdminToken(KEYCLOAK_ADMIN_USER, KEYCLOAK_ADMIN_PASSWORD),
    };
    const response = await fetch(KEYCLOAK_HOST + '/auth/admin/realms/master/users/' + user_id, { headers: headers })
    return response.json();
}

const typeDefs = gql`
  type keycloak_profile {
    name: String
    email: String
  }
  type Query {
    keycloak: keycloak_profile
  }
`;
const resolvers = {
    Query: {
        keycloak: async (parent, args, context) => {
            const token = (context.headers.authorization || '').replace('Bearer ', '');
            if (!token) {
                return 'Authorization token is missing!';
            }
            try {
                const decoded = jwt.decode(token);
                const profileInfo = await getKeycloakProfileInfo(decoded.sub);
                return {
                    name: profileInfo.username,
                    email: profileInfo.email,
                };
            } catch (error) {
                console.error(error);
                return null;
            }
        },
    },
};
const context = ({ req }) => {
    return { headers: req.headers };
};
const app = new ApolloServer({ typeDefs, resolvers, context });
app.listen({ port: PORT });
