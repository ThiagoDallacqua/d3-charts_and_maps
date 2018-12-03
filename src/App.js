import React, { Component } from "react";
import * as d3 from "d3";
import * as topojson from "topojson";
import europe from './assets/europe.json'
import './App.css'

const width = 850;
const height = 400;
const margin = { top: 20, right: 40, bottom: 20, left: 40 };

const Button = props => (
  <button style={{maxWidth: '50vw'}} onClick={props.onClick}>{props.title}</button>
)

class Chart extends React.Component {
  xAxis = d3.axisBottom()
  yAxis = d3.axisLeft()

  componentDidMount() {
    const { xScale, yScale, onSelect } = this.props

    // setup the axis

    this.xAxis.scale(xScale)
    d3.select(this.refs.xAxis).call(this.xAxis)
    
    this.yAxis.scale(yScale)
    d3.select(this.refs.yAxis).call(this.yAxis)

    //setup the brush
    this.brush = d3.brushX()
    .extent([
      [margin.left, margin.top],
      [width - margin.right, height - margin.top]
    ]).on('end', () => {
      if (!d3.event.selection) return onSelect([])
      const [minX, maxX] = d3.event.selection
      const range = [
        xScale.invert(minX),
        xScale.invert(maxX)
      ]

      onSelect(range)
    })

    d3.select(this.refs.brush).call(this.brush)
  }

  getFill = (range, xScale, d) => {
    if (!range.length) return d.fill
    const shouldHaveColor = xScale.invert(d.x) >= range[0] && xScale.invert(d.x) <= range[1]

    return shouldHaveColor ? d.fill : 'rgba(130, 130, 130, .6)'
  }

  render() {
    const { bars, range, xScale } = this.props

    return (
      <svg width={width} height={height}>
        {bars.map(d => (
          <rect
            key={`${d.y}${d.x}${d.height}${d.fill}`}
            x={d.x}
            y={d.y}
            width={2}
            height={d.height}
            fill={this.getFill(range, xScale, d)}
          />
        ))}
        <g ref='xAxis' transform={`translate(0, ${height - margin.bottom})`} />
        <g ref='yAxis' transform={`translate(${margin.left}, 0)`} />
        <g ref='brush' />
      </svg>
    )
  }
}
class MapChart extends React.Component {
  state = {
    evaluate: undefined,
    maindata: {}
  }
  xAxis = d3.axisBottom()
  yAxis = d3.axisLeft()
  height = 400
  width = 300

  componentDidMount() {
    this.mainMap = europe
    const evaluate = d3.geoPath().projection(d3.geoConicConformal().scale(800).center([0, 42]).translate([975 - 1200 / 2, 600 - 170 / 2]))
    const mainData = topojson.feature(this.mainMap, this.mainMap.objects.countries)

    this.setState({ evaluate, mainData })

    // zoom
  }

  render() {
    return (
      <svg ref='mapSvg' style={{ minWidth: '925px', width: '925px'}} width={'925px'} height={'600px'}>
        {
          this.state.evaluate && (
            this.state.mainData.features.map((d, index) => (
              <path
                className='mapItem'
                key={`${d}${index}`}
                ref='mapPath'
                fill={'rgba(230, 130, 30, .5)'}
                d={this.state.evaluate(d)}
                strokeWidth={2}
                stroke={'rgba(150,150,150, .8)'}
              />
            ))
          )
        }
        <g ref='gMap' transform='translate(0,40)' />
      </svg>
    )
  }
}

class LineChart extends React.Component {
  xAxis = d3.axisBottom()
  yAxis = d3.axisLeft()

  componentDidMount() {
    const { xScale, yScale } = this.props

    // setup the axis
    this.xAxis.scale(xScale)
    d3.select(this.refs.xAxis).call(this.xAxis)
    this.yAxis.scale(yScale)
    d3.select(this.refs.yAxis).call(this.yAxis)
  }

  componentDidUpdate() {
    const { xScale, yScale } = this.props

    // setup the axis
    this.xAxis.scale(xScale)
    d3.select(this.refs.xAxis).call(this.xAxis)
    this.yAxis.scale(yScale)
    d3.select(this.refs.yAxis).call(this.yAxis)
  }

  render() {
    const { lines } = this.props

    return (
      <svg width={width} height={height}>
        {lines.map(d => (
          <path
            d={d.path}
            fill={'none'}
            key={`${d.fill}`}
            strokeWidth={2}
            stroke={d.fill}
          />
        ))}
        <g ref='xAxis' transform={`translate(0, ${height - margin.bottom})`} />
        <g ref='yAxis' transform={`translate(${margin.left - 2}, 0)`} />
      </svg>
    )
  }
}

const DataRenderer = ({ data }) => (
  <ol className="list">
    {
      data.map(d => (
        <li key={d.date}>
          <ul>
            {`Date: ${new Date(d.date).toLocaleDateString()}`}
            <li>{`highest temperature${d.high}`}</li>
            <li>{`lowest temperature${d.low}`}</li>
            <li>{`average temperature${d.avg}`}</li>
          </ul>
        </li>
      ))
    }
  </ol>
)
class App extends Component {
  state = {
    bars: [],
    sfBars: [],
    nyBars: [],
    sfLines: [],
    nyLines: [],
    lines: [],
    range: [],
    xScale: undefined,
    yScale: undefined,
    xScaleLine: undefined,
    yScaleLine: undefined,
    sfData: [],
    nyData: [],
    data: [],
    filteredData: []
  }
  getBars = (data, city) => {
    //bars
    const xExtent = d3.extent(data, d => d.date);
    const [min, max] = d3.extent(data, d => d.high);
    const xScale = d3.scaleTime().domain(xExtent).range([margin.left, width - margin.right]);
    const yScale = d3.scaleLinear().domain([Math.min(min, 0), max]).range([height - margin.bottom, margin.top]);
    const colorExtend = d3.extent(data, d => d.avg).reverse()
    const colorScale = d3.scaleSequential().domain(colorExtend).interpolator(d3.interpolateRdYlBu)
    const array = data.map((d, index) => ({
      x: xScale(d.date),
      y: yScale(d.high),
      height: yScale(d.low) - yScale(d.high),
      fill: colorScale(d.avg)
    }))

    // lines

    const xScaleLine = d3.scaleTime().range([margin.left, width - margin.right])
    const yScaleLine = d3.scaleLinear().range([height - margin.bottom, margin.top])

    // set domains on the scales
    const timeDomain = d3.extent(data, d => d.date);
    const tempMax = d3.max(data, d => d.high);
    xScaleLine.domain(timeDomain);
    yScaleLine.domain([0, tempMax]);

    // create and use line generator for high and low temperature
    const lineGenerator = d3.line().x(d => xScaleLine(d.date))
    const linesArray = [
      {
        fill: 'rgba(200, 50, 50, .6)',
        path: lineGenerator.y(d => yScaleLine(d.high))(data),
      },
      {
        fill: 'rgba(50, 50, 200, .6)',
        path: lineGenerator.y(d => yScaleLine(d.low))(data),
      },
    ]

    city === 'sf' 
    ? this.setState({
        bars: array,
        sfBars: array,
        lines: linesArray,
        sfLines: linesArray,
        xScale: xScale,
        yScale: yScale,
        xScaleLine: xScaleLine,
        yScaleLine: yScaleLine,
        data: data,
        sfData: data
      }) 
    : this.setState({
        bars: array,
        nyBars: array,
        lines: linesArray,
        nyLines: linesArray,
        xScale: xScale,
        yScale: yScale,
        xScaleLine: xScaleLine,
        yScaleLine: yScaleLine,
        data: data,
        nyData: data
      })
  }
  onClickSF = async () => {
    if (this.state.sfBars.length) {
      this.setState({ bars: this.state.sfBars, lines: this.state.sfLines, data: this.state.sfData, range: [] })
    } else {
      const data = await d3.json('https://raw.githubusercontent.com/sxywu/react-d3-example/master/public/sf.json')
      .then(resp => {
        return resp.map(d => Object.assign(d, { date: new Date(d.date) }));
      })
    this.getBars(data, 'sf')
    }
  }
  onClickNY = async () => {
    if (this.state.nyBars.length) {
      this.setState({ bars: this.state.nyBars, lines: this.state.nyLines, data: this.state.nyData, range: [] })
    } else {
      const data = await d3.json('https://raw.githubusercontent.com/sxywu/react-d3-example/master/public/ny.json')
      .then(resp => {
        return resp.map(d => Object.assign(d, { date: new Date(d.date) }));
      })
    this.getBars(data, 'ny')
    }
  }
  onSelectDataFromChart = range => {
    const newData = this.state.data.filter(d => new Date(d.date) >= new Date(range[0]) && new Date(d.date) <= new Date(range[1]))

    if(!!newData.length) {

      // set domains on the scales
      const xScaleLine = d3.scaleTime().range([margin.left, width - margin.right])
      const yScaleLine = d3.scaleLinear().range([height - margin.bottom, margin.top])

      const timeDomain = d3.extent(newData, d => d.date);
      const tempMax = d3.max(newData, d => d.high);
      xScaleLine.domain(timeDomain);
      yScaleLine.domain([0, tempMax]);

      // create and use line generator for high and low temperature
      const lineGenerator = d3.line().x(d => xScaleLine(d.date))
      const linesArray = [
        {
          fill: 'rgba(200, 50, 50, .6)',
          path: lineGenerator.y(d => yScaleLine(d.high))(newData),
        },
        {
          fill: 'rgba(50, 50, 200, .6)',
          path: lineGenerator.y(d => yScaleLine(d.low))(newData),
        },
      ]

      this.setState({ range, filteredData: newData, lines: linesArray, xScaleLine: xScaleLine, yScaleLine: yScaleLine })
    } else {

      const xScaleLine = d3.scaleTime().range([margin.left, width - margin.right])
      const yScaleLine = d3.scaleLinear().range([height - margin.bottom, margin.top])

      // set domains on the scales
      const timeDomain = d3.extent(this.state.data, d => d.date);
      const tempMax = d3.max(this.state.data, d => d.high);
      xScaleLine.domain(timeDomain);
      yScaleLine.domain([0, tempMax]);

      // create and use line generator for high and low temperature
      const lineGenerator = d3.line().x(d => xScaleLine(d.date))
      const linesArray = [
        {
          fill: 'rgba(200, 50, 50, .6)',
          path: lineGenerator.y(d => yScaleLine(d.high))(this.state.data),
        },
        {
          fill: 'rgba(50, 50, 200, .6)',
          path: lineGenerator.y(d => yScaleLine(d.low))(this.state.data),
        },
      ]

      this.setState({ range, filteredData: newData, lines: linesArray, xScaleLine: xScaleLine, yScaleLine: yScaleLine })
    }
  }

  render() {
    return (
      <div className="App">
        <Button title={'San Francisco'} onClick={this.onClickSF} />
        <Button title={'New York'} onClick={this.onClickNY} />
        <header className="Charts">
          {!!this.state.bars.length && (
            <Chart
              bars={this.state.bars}
              xScale={this.state.xScale}
              yScale={this.state.yScale}
              onSelect={this.onSelectDataFromChart}
              range={this.state.range}
            />
          )}
          {!!this.state.lines.length && (
            <LineChart
              lines={this.state.lines}
              xScale={this.state.xScaleLine}
              yScale={this.state.yScaleLine}
              onSelect={this.onSelectDataFromChart}
            />
          )}
        </header>
        <header className="Charts">
          <MapChart />
        </header>
        {!!this.state.data.length && (
          <DataRenderer data={!!this.state.filteredData.length ? this.state.filteredData : this.state.data} />
        )}
      </div>
    );
  }
}

export default App;