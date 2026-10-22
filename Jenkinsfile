pipeline {
  agent any
  options {
    disableConcurrentBuilds()
  }
  triggers {
    pollSCM('H/5 * * * *')
  }
  environment {
    // Dominio de la app en la caja de arena. En otro servidor se define en su .env.
    APP_HOST = 'dsl.vpn.reuno.cl'
  }
  stages {
    // Si el lint o las pruebas (con su cobertura mínima) fallan, no se
    // despliega. Corren dentro de Docker: Jenkins no necesita Node.
    stage('Lint') {
      steps {
        sh 'docker build --target lint .'
      }
    }
    stage('Pruebas') {
      steps {
        sh 'docker build --target prueba .'
      }
    }
    stage('Desplegar') {
      steps {
        // Las credenciales de la base son las mismas que usa bd-dsl
        withCredentials([file(credentialsId: 'dsl-env', variable: 'ENV_FILE')]) {
          sh 'docker compose --env-file "$ENV_FILE" up -d --build'
        }
      }
    }
  }
}
