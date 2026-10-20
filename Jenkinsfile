// Jenkins declarative pipeline. Needs the Docker Pipeline, JUnit and HTML Publisher plugins.
pipeline {
  agent {
    docker {
      // Official Playwright image: browsers and OS dependencies pre-installed. Keep in step with @playwright/test.
      image 'mcr.microsoft.com/playwright:v1.59.1-noble'
      args '--ipc=host'
    }
  }

  parameters {
    choice(name: 'SUITE', choices: ['smoke', 'regression', 'perf'], description: 'Which suite to run')
  }

  triggers {
    cron('H 18 * * *') // nightly
  }

  options {
    timestamps()
    timeout(time: 60, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '30'))
  }

  environment {
    CI = 'true'
    HOME = "${WORKSPACE}"
  }

  stages {
    stage('Install') {
      steps {
        sh 'npm ci'
      }
    }

    stage('Quality gate') {
      steps {
        sh 'npm run lint'
        sh 'npm run format:check'
        sh 'npm run typecheck'
      }
    }

    stage('Test') {
      steps {
        script {
          def commands = [
            smoke     : 'npm run test:smoke',
            regression: 'npm run test:regression',
            perf      : 'npm run test:perf',
          ]
          sh commands[params.SUITE]
        }
      }
    }
  }

  post {
    always {
      junit allowEmptyResults: true, testResults: 'reports/junit/results.xml'
      publishHTML(target: [
        reportName           : 'Playwright Report',
        reportDir            : 'reports/html',
        reportFiles          : 'index.html',
        keepAll              : true,
        alwaysLinkToLastBuild: true,
        allowMissing         : true,
      ])
      archiveArtifacts artifacts: 'reports/**', allowEmptyArchive: true
    }
  }
}
