/* eslint-disable no-invalid-this*/
/* eslint-disable no-undef*/
const path = require("path");
const {checkFileExists,create_browser,from_env,ROOT,path_assignment, warn_errors, scored} = require("../utils/testutils");
const fs = require("fs");
const net = require('net');
const spawn = require("child_process").spawn;
const util = require('util');
const exec = util.promisify(require("child_process").exec);


const PATH_ASSIGNMENT = path_assignment("blog");

const TIMEOUT =  parseInt(from_env("TIMEOUT", 6000));
const TEST_PORT =  parseInt(from_env("TEST_PORT", "3001"));


let browser = create_browser();


describe("Tests Práctica 6", function() {
    after(function () {
        warn_errors();
    });

    describe("Prechecks", function () {
        scored(`Comprobando que existe la carpeta de la entrega: ${PATH_ASSIGNMENT}`,
               -1,
               async function () {
                   this.msg_err = `No se encontró la carpeta '${PATH_ASSIGNMENT}'`;
                   (await checkFileExists(PATH_ASSIGNMENT)).should.be.equal(true);
                 });
    });


    describe("Tests funcionales", function () {
        var server;
    
        before(async function() {

            let bin_path = path.join(PATH_ASSIGNMENT, "bin", "www");
            server = spawn('node', [bin_path], {env: {PORT: TEST_PORT, PATH: process.env.PATH}});
            server.stdout.setEncoding('utf-8');
            server.stdout.on('data', function(data) {
                debug('Salida del servidor: ', data);
            })
            console.log(`Lanzado el servidor en el puerto ${TEST_PORT}`);
            await new Promise(resolve => setTimeout(resolve, TIMEOUT));
            browser.site = `http://127.0.0.1:${TEST_PORT}/`;
            try{
                await browser.visit("/");
                browser.assert.status(200);
            }catch(e){
                console.log("No se ha podido contactar con el servidor.");
                throw(e);
            }
        });

        after(async function() {
            await server.kill();
        })

        scored(`Comprobar que se han creado los ficheros pedidos en el enunciado`, -1, async function () {
            this.msg_ok = 'Se han encontrado los ficheros pedidos';
            this.msg_err = 'No se ha encontrado views/layout.ejs';
            fs.existsSync(path.join(PATH_ASSIGNMENT, "views", "layout.ejs")).should.be.equal(true);
            this.msg_err = 'No se ha encontrado views/author.ejs';
            fs.existsSync(path.join(PATH_ASSIGNMENT, "views", "author.ejs")).should.be.equal(true);
            this.msg_err = 'No se ha encontrado public/images/foto.jpg';
            fs.existsSync(path.join(PATH_ASSIGNMENT, "public", "images", "foto.jpg")).should.be.equal(true);
        });

        let endpoint = '/';
        let code = 200;
        scored(`Comprobar que se resuelve una petición a ${endpoint} con código ${code} y que title y h1 son correctos`,
               2, async function () {
            this.msg_ok = 'Respuesta correcta';
            this.msg_err = 'Respuesta incorrecta';
            check = function(){
                browser.assert.status(code);
                browser.text('title').should.be.equal('Blog');
                browser.text('h1').includes('Welcome to My Blog').should.be.equal(true);
            }
            return browser.visit(endpoint)
                .then(check)
                .catch(check);
        });

        endpoint1 = '/users';
        code1 = 404;
        scored(`Comprobar que se resuelve una petición a ${endpoint1} con código ${code1}`,
               1.5, async function () {
            this.msg_ok = 'Respuesta correcta';
            this.msg_err = 'No hubo respuesta';
            check = function(){
                browser.assert.status(code1);
            }
            return browser.visit(endpoint1)
                .then(check)
                .catch(check);
        });

        scored(`Comprobar el uso correcto de las plantillas express-partials`,
               3, async function () {
            this.msg_ok = 'Se incluyen todos los elementos necesarios en la plantilla';
            this.msg_err = 'No se ha encontrado todos los elementos necesarios';
            let checks = {
                "layout.ejs": {
                    true: [/<%- body %>/g, /<header/, /<\/header>/, /<nav/, /<\/nav/,  /<main/, /<\/main/, /<footer/, /<\/footer>/]
                },
                "index.ejs": {
                    true: [/<h1/, /<\/h1>/, /<section/, /<\/section>/],
                    false: [/<body/, /<\/body>/, /<html/, /<\/html>/]
                },
                "error.ejs": {
                    false: [/<body/, /<\/body>/, /<html/, /<\/html>/]
                },
                "author.ejs": {
                    false: [/<body/, /<\/body>/, /<html/, /<\/html>/]
                }
            };

            for (fpath in checks) {
                let templ = fs.readFileSync(path.join(PATH_ASSIGNMENT, "views", fpath), "utf8");
                for(status in checks[fpath]) {
                    elements = checks[fpath][status];
                    for(var elem in elements){
                        let e = elements[elem];
                        if (status == 'true') {
                            this.msg_err = `${fpath} no incluye ${e}`;
                        } else {
                            this.msg_err = `${fpath} incluye ${e}, pero debería haberse borrado`;
                        }
                        e.test(templ).should.be.equal((status == 'true'));
                    }
                }
            }
        });


        endpoint2 = '/author';
        code2 = 200;
        scored(`Comprobar que se resuelve una petición a ${endpoint2} con código ${code2}`,
               1.5, async function () {
            this.msg_ok = 'Respuesta correcta';
            this.msg_err = 'No hubo respuesta';
            check = function(){
                browser.assert.status(code2);
            }
            return browser.visit(endpoint2)
                .then(check)
                .catch(check);
        });

        scored(`Comprobar que se muestra la foto`,
               2, async function () {
                this.name = "";
                this.msg_ok = 'Foto incorporada';
                this.msg_err = 'No se encuentra la foto';

                await browser.visit("/author");
                browser.assert.status(200);
                allcontent = browser.html();
                content = browser.html("img");
                content.includes("images/foto.jpg").should.be.equal(true);
          })
    });

})
