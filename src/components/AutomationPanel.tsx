/**
 * Automation Panel
 * Shows automation and testing features: tests, debugging, performance, security, CI/CD
 */

import { useState, useEffect } from 'react'
import { 
  X, Play, Square, Plus, Shield, Loader2,
  Activity
} from 'lucide-react'
import { testGenerationService, TestCase, TestSuite, RegressionTest } from '../services/testGeneration'
import { debuggingService, Breakpoint, DebugSession } from '../services/debugging'
import { performanceAnalysisService, PerformanceProfile, PerformanceIssue } from '../services/performanceAnalysis'
import { securityScanningService, SecurityVulnerability, SecurityScan } from '../services/securityScanning'
import { ciPipelineService, Pipeline, BuildStatus } from '../services/ciPipeline'

interface AutomationPanelProps {
  onClose: () => void
}

type Tab = 'tests' | 'debugging' | 'performance' | 'security' | 'ci'

export default function AutomationPanel({ onClose }: AutomationPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('tests')
  
  // Tests state
  const [tests, setTests] = useState<TestCase[]>([])
  const [suites, setSuites] = useState<TestSuite[]>([])
  const [regressionTests, setRegressionTests] = useState<RegressionTest[]>([])
  const [selectedTest, setSelectedTest] = useState<string | null>(null)
  
  // Debugging state
  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>([])
  const [sessions, setSessions] = useState<DebugSession[]>([])
  const [activeSession, setActiveSession] = useState<string | null>(null)
  
  // Performance state
  const [profiles, setProfiles] = useState<PerformanceProfile[]>([])
  const [issues, setIssues] = useState<PerformanceIssue[]>([])
  const [activeProfile, setActiveProfile] = useState<string | null>(null)
  
  // Security state
  const [vulnerabilities, setVulnerabilities] = useState<SecurityVulnerability[]>([])
  const [scans, setScans] = useState<SecurityScan[]>([])
  const [activeScan, setActiveScan] = useState<string | null>(null)
  
  // CI/CD state
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [builds, setBuilds] = useState<BuildStatus[]>([])

  useEffect(() => {
    // Load initial data
    setTests(testGenerationService.getAllTests())
    setSuites(testGenerationService.getAllSuites())
    setRegressionTests([]) // Will be loaded separately
    setBreakpoints(debuggingService.getAllBreakpoints())
    setSessions(debuggingService.getAllSessions())
    setProfiles(performanceAnalysisService.getAllProfiles())
    setIssues(performanceAnalysisService.getAllIssues())
    setVulnerabilities(securityScanningService.getAllVulnerabilities())
    setScans(securityScanningService.getAllScans())
    setPipelines(ciPipelineService.getAllPipelines())
    setBuilds(ciPipelineService.getAllBuilds())

    // Set up event listeners
    const unsubscribeTests = testGenerationService.on('test-completed', () => {
      setTests(testGenerationService.getAllTests())
    })
    
    const unsubscribeBreakpoints = debuggingService.on('breakpoint-added', () => {
      setBreakpoints(debuggingService.getAllBreakpoints())
    })
    
    const unsubscribeSessions = debuggingService.on('session-paused', () => {
      setSessions(debuggingService.getAllSessions())
    })
    
    const unsubscribeProfiles = performanceAnalysisService.on('profile-completed', () => {
      setProfiles(performanceAnalysisService.getAllProfiles())
      setIssues(performanceAnalysisService.getAllIssues())
    })
    
    const unsubscribeScans = securityScanningService.on('scan-completed', () => {
      setVulnerabilities(securityScanningService.getAllVulnerabilities())
      setScans(securityScanningService.getAllScans())
    })
    
    const unsubscribePipelines = ciPipelineService.on('pipeline-completed', () => {
      setPipelines(ciPipelineService.getAllPipelines())
      setBuilds(ciPipelineService.getAllBuilds())
    })

    return () => {
      unsubscribeTests()
      unsubscribeBreakpoints()
      unsubscribeSessions()
      unsubscribeProfiles()
      unsubscribeScans()
      unsubscribePipelines()
    }
  }, [])

  const handleGenerateTests = async () => {
    const generated = await testGenerationService.generateTests('src/components/App.tsx', 'handleClick', 'unit')
    setTests([...tests, ...generated])
  }

  const handleRunTest = async (testId: string) => {
    await testGenerationService.runTest(testId)
    setTests(testGenerationService.getAllTests())
  }

  const handleStartProfile = async () => {
    const profile = await performanceAnalysisService.startProfile('Performance Profile', 'Testing application performance')
    setActiveProfile(profile.id)
    setProfiles([...profiles, profile])
    
    setTimeout(async () => {
      await performanceAnalysisService.stopProfile(profile.id)
      setProfiles(performanceAnalysisService.getAllProfiles())
      setIssues(performanceAnalysisService.getAllIssues())
      setActiveProfile(null)
    }, 3000)
  }

  const handleStartSecurityScan = async () => {
    const scan = await securityScanningService.startScan('Security Scan', ['dependencies', 'code', 'secrets'])
    setActiveScan(scan.id)
    setScans([...scans, scan])
  }

  const handleCreatePipeline = async () => {
    const pipeline = await ciPipelineService.createPipeline('Build Pipeline', 'main', 'abc123', 'push')
    setPipelines([...pipelines, pipeline])
    
    setTimeout(async () => {
      await ciPipelineService.runPipeline(pipeline.id)
      setPipelines(ciPipelineService.getAllPipelines())
      setBuilds(ciPipelineService.getAllBuilds())
    }, 500)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': case 'passed': case 'completed': return '#22c55e'
      case 'failed': case 'error': return '#ef4444'
      case 'running': case 'pending': return '#f59e0b'
      default: return '#666'
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#151515',
      color: '#ddd'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid #2a2a2a'
      }}>
        <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#ddd' }}>Automation & Testing</h2>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #2a2a2a',
        background: '#1a1a1a'
      }}>
        {(['tests', 'debugging', 'performance', 'security', 'ci'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '10px 12px',
              background: activeTab === tab ? '#151515' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #FF00FF' : '2px solid transparent',
              color: activeTab === tab ? '#FF00FF' : '#888',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: activeTab === tab ? 500 : 400,
              textTransform: 'capitalize'
            }}
          >
            {tab === 'ci' ? 'CI/CD' : tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {activeTab === 'tests' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>Test Generation</h3>
              <button
                onClick={handleGenerateTests}
                style={{
                  padding: '6px 12px',
                  background: '#FF00FF',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Plus size={12} />
                Generate Tests
              </button>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Test Suites ({suites.length})</h4>
              {suites.length === 0 ? (
                <div style={{ padding: '16px', background: '#1a1a1a', borderRadius: '4px', color: '#666', fontSize: '11px' }}>
                  No test suites yet
                </div>
              ) : (
                suites.map(suite => (
                  <div key={suite.id} style={{
                    padding: '10px',
                    background: '#1a1a1a',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 500 }}>{suite.name}</div>
                      <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>{suite.tests.length} tests</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '10px', color: getStatusColor(suite.status) }}>{suite.status}</span>
                      <button
                        onClick={() => testGenerationService.runTestSuite(suite.id)}
                        style={{ padding: '4px 8px', background: '#2a2a2a', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        <Play size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div>
              <h4 style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Tests ({tests.length})</h4>
              {tests.length === 0 ? (
                <div style={{ padding: '16px', background: '#1a1a1a', borderRadius: '4px', color: '#666', fontSize: '11px' }}>
                  No tests yet. Generate tests to get started.
                </div>
              ) : (
                tests.slice(0, 10).map(test => (
                  <div key={test.id} style={{
                    padding: '10px',
                    background: '#1a1a1a',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: 500 }}>{test.name}</div>
                      <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>{test.file}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {test.result && (
                        <span style={{ fontSize: '10px', color: getStatusColor(test.status) }}>
                          {test.result.passed ? '✓' : '✗'}
                        </span>
                      )}
                      <span style={{ fontSize: '10px', color: getStatusColor(test.status) }}>{test.status}</span>
                      <button
                        onClick={() => handleRunTest(test.id)}
                        disabled={test.status === 'running'}
                        style={{
                          padding: '4px 8px',
                          background: '#2a2a2a',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: test.status === 'running' ? 'not-allowed' : 'pointer',
                          opacity: test.status === 'running' ? 0.5 : 1
                        }}
                      >
                        {test.status === 'running' ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={12} />}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'debugging' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>Debugging</h3>
              <button
                onClick={() => debuggingService.addBreakpoint('src/App.tsx', 42)}
                style={{
                  padding: '6px 12px',
                  background: '#FF00FF',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Plus size={12} />
                Add Breakpoint
              </button>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Breakpoints ({breakpoints.length})</h4>
              {breakpoints.length === 0 ? (
                <div style={{ padding: '16px', background: '#1a1a1a', borderRadius: '4px', color: '#666', fontSize: '11px' }}>
                  No breakpoints set
                </div>
              ) : (
                breakpoints.map(bp => (
                  <div key={bp.id} style={{
                    padding: '10px',
                    background: '#1a1a1a',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '12px' }}>{bp.file}:{bp.line}</div>
                      {bp.condition && <div style={{ fontSize: '10px', color: '#666' }}>Condition: {bp.condition}</div>}
                    </div>
                    <button
                      onClick={() => debuggingService.removeBreakpoint(bp.id)}
                      style={{ padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#888' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div>
              <h4 style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Debug Sessions ({sessions.length})</h4>
              {sessions.length === 0 ? (
                <div style={{ padding: '16px', background: '#1a1a1a', borderRadius: '4px', color: '#666', fontSize: '11px' }}>
                  No active debug sessions
                </div>
              ) : (
                sessions.map(session => (
                  <div key={session.id} style={{
                    padding: '10px',
                    background: '#1a1a1a',
                    borderRadius: '4px',
                    marginBottom: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 500 }}>{session.name}</div>
                        <div style={{ fontSize: '10px', color: '#666' }}>Status: {session.status}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {session.status === 'paused' && (
                          <>
                            <button onClick={() => debuggingService.stepOver(session.id)} style={{ padding: '4px', background: '#2a2a2a', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                              <Play size={12} />
                            </button>
                            <button onClick={() => debuggingService.continueSession(session.id)} style={{ padding: '4px', background: '#2a2a2a', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                              <Play size={12} />
                            </button>
                          </>
                        )}
                        <button onClick={() => debuggingService.stopSession(session.id)} style={{ padding: '4px', background: '#2a2a2a', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                          <Square size={12} />
                        </button>
                      </div>
                    </div>
                    {session.currentFrame && (
                      <div style={{ padding: '8px', background: '#0d0d0d', borderRadius: '4px', fontSize: '10px' }}>
                        <div>Frame: {session.currentFrame.name}</div>
                        <div style={{ color: '#666' }}>{session.currentFrame.file}:{session.currentFrame.line}</div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>Performance Analysis</h3>
              <button
                onClick={handleStartProfile}
                disabled={activeProfile !== null}
                style={{
                  padding: '6px 12px',
                  background: activeProfile ? '#666' : '#FF00FF',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: activeProfile ? 'not-allowed' : 'pointer',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {activeProfile ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Activity size={12} />}
                {activeProfile ? 'Profiling...' : 'Start Profile'}
              </button>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Performance Profiles ({profiles.length})</h4>
              {profiles.length === 0 ? (
                <div style={{ padding: '16px', background: '#1a1a1a', borderRadius: '4px', color: '#666', fontSize: '11px' }}>
                  No performance profiles yet
                </div>
              ) : (
                profiles.slice(0, 5).map(profile => (
                  <div key={profile.id} style={{
                    padding: '10px',
                    background: '#1a1a1a',
                    borderRadius: '4px',
                    marginBottom: '8px'
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '8px' }}>{profile.name}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '10px' }}>
                      <div>
                        <div style={{ color: '#666' }}>Avg Response</div>
                        <div>{profile.summary.averageResponseTime.toFixed(0)}ms</div>
                      </div>
                      <div>
                        <div style={{ color: '#666' }}>Memory</div>
                        <div>{profile.summary.memoryUsage.toFixed(0)}MB</div>
                      </div>
                      <div>
                        <div style={{ color: '#666' }}>CPU</div>
                        <div>{profile.summary.cpuUsage.toFixed(0)}%</div>
                      </div>
                      <div>
                        <div style={{ color: '#666' }}>Throughput</div>
                        <div>{profile.summary.throughput.toFixed(0)} req/s</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div>
              <h4 style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Performance Issues ({issues.length})</h4>
              {issues.length === 0 ? (
                <div style={{ padding: '16px', background: '#1a1a1a', borderRadius: '4px', color: '#666', fontSize: '11px' }}>
                  No performance issues detected
                </div>
              ) : (
                issues.slice(0, 5).map(issue => (
                  <div key={issue.id} style={{
                    padding: '10px',
                    background: '#1a1a1a',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    borderLeft: `3px solid ${issue.severity === 'critical' ? '#ef4444' : issue.severity === 'high' ? '#f59e0b' : '#22c55e'}`
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>{issue.description}</div>
                    {issue.file && <div style={{ fontSize: '10px', color: '#666' }}>{issue.file}:{issue.line}</div>}
                    <div style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>{issue.recommendation}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>Security Scanning</h3>
              <button
                onClick={handleStartSecurityScan}
                disabled={activeScan !== null}
                style={{
                  padding: '6px 12px',
                  background: activeScan ? '#666' : '#FF00FF',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: activeScan ? 'not-allowed' : 'pointer',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {activeScan ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Shield size={12} />}
                {activeScan ? 'Scanning...' : 'Start Scan'}
              </button>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Recent Scans ({scans.length})</h4>
              {scans.length === 0 ? (
                <div style={{ padding: '16px', background: '#1a1a1a', borderRadius: '4px', color: '#666', fontSize: '11px' }}>
                  No security scans yet
                </div>
              ) : (
                scans.slice(0, 5).map(scan => (
                  <div key={scan.id} style={{
                    padding: '10px',
                    background: '#1a1a1a',
                    borderRadius: '4px',
                    marginBottom: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 500 }}>{scan.name}</div>
                      <span style={{ fontSize: '10px', color: getStatusColor(scan.status) }}>{scan.status}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '10px', color: '#666' }}>
                      <span>Total: {scan.summary.total}</span>
                      <span style={{ color: '#ef4444' }}>Critical: {scan.summary.critical}</span>
                      <span style={{ color: '#f59e0b' }}>High: {scan.summary.high}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div>
              <h4 style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Vulnerabilities ({vulnerabilities.length})</h4>
              {vulnerabilities.length === 0 ? (
                <div style={{ padding: '16px', background: '#1a1a1a', borderRadius: '4px', color: '#666', fontSize: '11px' }}>
                  No vulnerabilities found
                </div>
              ) : (
                vulnerabilities.slice(0, 10).map(vuln => (
                  <div key={vuln.id} style={{
                    padding: '10px',
                    background: '#1a1a1a',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    borderLeft: `3px solid ${vuln.severity === 'critical' ? '#ef4444' : vuln.severity === 'high' ? '#f59e0b' : '#22c55e'}`
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>{vuln.title}</div>
                    <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>{vuln.description}</div>
                    {vuln.file && <div style={{ fontSize: '10px', color: '#888' }}>{vuln.file}:{vuln.line}</div>}
                    <div style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>{vuln.recommendation}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'ci' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>CI/CD Pipelines</h3>
              <button
                onClick={handleCreatePipeline}
                style={{
                  padding: '6px 12px',
                  background: '#FF00FF',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Plus size={12} />
                Create Pipeline
              </button>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Pipelines ({pipelines.length})</h4>
              {pipelines.length === 0 ? (
                <div style={{ padding: '16px', background: '#1a1a1a', borderRadius: '4px', color: '#666', fontSize: '11px' }}>
                  No pipelines yet
                </div>
              ) : (
                pipelines.slice(0, 5).map(pipeline => (
                  <div key={pipeline.id} style={{
                    padding: '10px',
                    background: '#1a1a1a',
                    borderRadius: '4px',
                    marginBottom: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 500 }}>{pipeline.name}</div>
                        <div style={{ fontSize: '10px', color: '#666' }}>{pipeline.branch} • {pipeline.commit.substring(0, 7)}</div>
                      </div>
                      <span style={{ fontSize: '10px', color: getStatusColor(pipeline.status) }}>{pipeline.status}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {pipeline.stages.map(stage => (
                        <div key={stage.id} style={{
                          padding: '4px 8px',
                          background: '#0d0d0d',
                          borderRadius: '4px',
                          fontSize: '10px',
                          color: getStatusColor(stage.status)
                        }}>
                          {stage.name}: {stage.status}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div>
              <h4 style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Recent Builds ({builds.length})</h4>
              {builds.length === 0 ? (
                <div style={{ padding: '16px', background: '#1a1a1a', borderRadius: '4px', color: '#666', fontSize: '11px' }}>
                  No builds yet
                </div>
              ) : (
                builds.slice(0, 5).map(build => (
                  <div key={build.id} style={{
                    padding: '10px',
                    background: '#1a1a1a',
                    borderRadius: '4px',
                    marginBottom: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 500 }}>{build.version}</div>
                        {build.testResults && (
                          <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
                            Tests: {build.testResults.passed}/{build.testResults.total} • Coverage: {build.testResults.coverage}%
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: '10px', color: getStatusColor(build.status) }}>{build.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
