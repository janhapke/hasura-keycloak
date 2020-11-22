/*

This code was inspired by the following Tutorial:

https://hasura.io/learn/graphql/hasura/custom-business-logic/1-actions/

and then translated to work with Keycloak.

*/

const express = require("express");
const bodyParser = require("body-parser");
const fetch = require('node-fetch');

process.on('SIGINT', process.exit);

const PORT = process.env.PORT || 3000;
const KEYCLOAK_HOST = process.env.KEYCLOAK_HOST || 'http://keycloak:8080';
const KEYCLOAK_ADMIN_USER = process.env.KEYCLOAK_ADMIN_USER || 'admin';
const KEYCLOAK_ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin';

const getKeycloakAdminToken = async (username, password) => {
    const response = await fetch(
        KEYCLOAK_HOST + '/auth/realms/master/protocol/openid-connect/token',
        {
            method: 'POST',
            body: new URLSearchParams({ username: username, password: password, grant_type: 'password', client_id: 'admin-cli'})
        }
    );
    const json = await response.json();
    return json.access_token;
}

const getKeycloakProfileInfo = async (user_id) => {
    const headers = {
        'Authorization': 'Bearer ' + await getKeycloakAdminToken(KEYCLOAK_ADMIN_USER, KEYCLOAK_ADMIN_PASSWORD),
    };
    const response = await fetch(KEYCLOAK_HOST + '/auth/admin/realms/master/users/' + user_id,{ headers: headers})
    return response.json();
}

const app = express();
app.use(bodyParser.json());
app.post('/keycloak', async (req, res) => {
    try {
        const profileInfo = await getKeycloakProfileInfo(req.body.session_variables && req.body.session_variables['x-hasura-user-id']);
        return res.json({
            name: profileInfo.username,
            email: profileInfo.email,
        });
    } catch (error) {
        console.error(error);
        return res.status(400).json({
            message: "error happened"
        })
    }
});
app.listen(PORT);
