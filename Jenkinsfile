/* ============================================================================
   Jenkinsfile — Streamz CI/CD
   ----------------------------------------------------------------------------
   Flow (as requested):  GitHub push -> Build -> Test -> Execute (deploy)
   If the deploy fails its health check, auto-roll-back to the previous image.

   Requirements on the Jenkins agent:
     - Docker CLI available (the agent can run `docker ...`)
     - bash + curl (the deploy/rollback scripts use them)
     - Internet access to pull node + Playwright base images

   The pipeline is triggered by a GitHub webhook (Settings -> Webhooks ->
   <jenkins-url>/github-webhook/). `githubPush()` below wires that up.
   ============================================================================ */

pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  triggers {
    githubPush()            // run automatically on every GitHub push
  }

  environment {
    IMAGE        = 'streamz'
    TAG          = "build-${env.BUILD_NUMBER}"
    CONTAINER    = 'streamz'
    PORT         = '3000'
    PW_IMAGE     = 'mcr.microsoft.com/playwright:v1.49.0-jammy'
    E2E_APP      = 'streamz-e2e'
    E2E_NET      = 'streamz-e2e-net'
  }

  stages {

    /* 1) BUILD — turn the pushed source into a versioned Docker image. ------ */
    stage('Build') {
      steps {
        sh 'docker build -t $IMAGE:$TAG .'
      }
    }

    /* 2a) TEST — unit + API + integration + smoke run inside the app image.
            These need no browser, so they run fast in the freshly built image. */
    stage('Unit / API / Integration / Smoke Tests') {
      steps {
        sh 'docker run --rm $IMAGE:$TAG npm run test:node'
      }
    }

    /* 2b) TEST — E2E in a real browser using the official Playwright image,
            pointed at the app running in its own container. */
    stage('E2E Tests') {
      steps {
        sh '''
          set -e
          docker rm -f $E2E_APP >/dev/null 2>&1 || true
          docker network create $E2E_NET >/dev/null 2>&1 || true

          # Start the app under test on the private E2E network.
          docker run -d --name $E2E_APP --network $E2E_NET $IMAGE:$TAG

          # Run Playwright against it. BASE_URL disables the config's webServer.
          docker run --rm --network $E2E_NET \
            -e BASE_URL=http://$E2E_APP:3000 \
            -e CI=true \
            -v "$PWD":/work -w /work \
            $PW_IMAGE \
            bash -lc "npm install && npx playwright test"
        '''
      }
      post {
        always {
          sh 'docker rm -f $E2E_APP >/dev/null 2>&1 || true'
          sh 'docker network rm $E2E_NET >/dev/null 2>&1 || true'
          archiveArtifacts artifacts: 'playwright-report/**', allowEmptyArchive: true
        }
      }
    }

    /* 3) EXECUTE (deploy) — run the tested image as the live container.
          deploy.sh saves the current image as streamz:previous first, then
          health-checks the new one. */
    stage('Deploy (Execute)') {
      steps {
        sh 'PORT=$PORT CONTAINER=$CONTAINER bash scripts/deploy.sh $IMAGE:$TAG'
      }
      post {
        success {
          // Promote this image as the known-good baseline for the next run.
          sh 'docker tag $IMAGE:$TAG $IMAGE:current'
          echo "Deployed ${IMAGE}:${TAG} successfully."
        }
        failure {
          echo 'Deploy/health-check failed — rolling back to the previous deployment.'
          sh 'PORT=$PORT CONTAINER=$CONTAINER bash scripts/rollback.sh'
        }
      }
    }
  }

  post {
    failure {
      echo 'Pipeline failed. A failure BEFORE the deploy stage leaves the ' +
           'currently-running (previous) deployment untouched; a failure ' +
           'DURING deploy triggers an automatic rollback (see the Deploy stage).'
    }
    always {
      // Tidy dangling images so the agent disk does not fill up over time.
      sh 'docker image prune -f >/dev/null 2>&1 || true'
    }
  }
}
